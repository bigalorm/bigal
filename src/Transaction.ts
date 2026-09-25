import { type Entity } from './Entity.js';
import { type IReadonlyRepository } from './IReadonlyRepository.js';
import { type IRepository } from './IRepository.js';
import { ManagedTransactionExecutor, resolveManagedTransactionExecutor } from './ManagedTransactionExecutor.js';
import { type IRepositoryOptions, ReadonlyRepository } from './ReadonlyRepository.js';
import { Repository } from './Repository.js';
import { getRepositoryOptions } from './RepositoryInternals.js';
import { getTransactionBeginQuery, getTransactionSettingsQueryAndParams } from './SqlHelper.js';
import { type RepositoryMap, type TransactionRepositories, TransactionScope } from './TransactionScope.js';
import { type TransactionConnection, type TransactionPool } from './types/index.js';

const MAX_POSTGRES_TIMEOUT_MS = 2_147_483_647;

const POSTGRES_SETTING_BY_TIMEOUT_OPTION: Record<TransactionTimeoutOption, string> = {
  lockTimeoutMs: 'lock_timeout',
  statementTimeoutMs: 'statement_timeout',
  idleInTransactionTimeoutMs: 'idle_in_transaction_session_timeout',
};

const TIMEOUT_OPTION_NAMES: readonly TransactionTimeoutOption[] = ['lockTimeoutMs', 'statementTimeoutMs', 'idleInTransactionTimeoutMs'];

type TransactionTimeoutOption = 'idleInTransactionTimeoutMs' | 'lockTimeoutMs' | 'statementTimeoutMs';

type RepositoryRegistry = Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;

interface CleanupErrorDetails extends Error {
  cleanupErrors?: readonly unknown[];
}

interface SourceRepository {
  name: string;
  options: IRepositoryOptions<Entity>;
  repository: ReadonlyRepository<Entity> | Repository<Entity>;
}

export type TransactionIsolationLevel = 'readCommitted' | 'repeatableRead' | 'serializable';

export interface TransactionOptions<TRepositories extends RepositoryMap> {
  pool: TransactionPool;
  repositories: TRepositories;
  idleInTransactionTimeoutMs?: number;
  isolationLevel?: TransactionIsolationLevel;
  lockTimeoutMs?: number;
  statementTimeoutMs?: number;
}

function assertTimeoutValue(name: string, value: number | undefined): void {
  if (value === undefined) {
    return;
  }

  if (!Number.isInteger(value) || value < 0 || value > MAX_POSTGRES_TIMEOUT_MS) {
    throw new RangeError(`${name} must be an integer between 0 and ${MAX_POSTGRES_TIMEOUT_MS}`);
  }
}

function validateOptions(options: TransactionOptions<RepositoryMap>): void {
  for (const optionName of TIMEOUT_OPTION_NAMES) {
    assertTimeoutValue(optionName, options[optionName]);
  }

  if (resolveManagedTransactionExecutor(options.pool)) {
    throw new Error('A managed transaction cannot be started from another managed transaction scope');
  }
}

function isStandardRepository(repository: unknown): repository is ReadonlyRepository<Entity> | Repository<Entity> {
  if (typeof repository !== 'object' || !repository) {
    return false;
  }

  return repository.constructor === ReadonlyRepository || repository.constructor === Repository;
}

function resolveSourceRepositories(repositories: RepositoryMap, pool: TransactionPool): SourceRepository[] {
  const sourceRepositories: SourceRepository[] = [];

  for (const [name, repository] of Object.entries(repositories)) {
    if (!isStandardRepository(repository)) {
      throw new TypeError(`Transaction repository "${name}" must be a standard Repository or ReadonlyRepository instance`);
    }

    const options = getRepositoryOptions(repository);
    if (!options || options.pool !== pool) {
      throw new Error(`Transaction repository "${name}" belongs to a different connection than the transaction pool`);
    }

    sourceRepositories.push({ name, options, repository });
  }

  return sourceRepositories;
}

function createScopedRegistry(sourceRegistry: RepositoryRegistry, executor: ManagedTransactionExecutor, scopedRepositoriesBySource: Map<object, IReadonlyRepository<Entity>>): void {
  const scopedRegistry: RepositoryRegistry = {};

  for (const [modelNameLowered, sourceRepository] of Object.entries(sourceRegistry)) {
    const sourceOptions = isStandardRepository(sourceRepository) ? getRepositoryOptions(sourceRepository) : undefined;
    if (!sourceOptions || sourceOptions.pool !== executor.sourcePool) {
      // Leaving these out makes relation traversal fail instead of escaping the transaction.
      continue;
    }

    const scopedOptions: IRepositoryOptions<Entity> = {
      ...sourceOptions,
      repositoriesByModelNameLowered: scopedRegistry,
      pool: executor,
      readonlyPool: executor,
    };
    const scopedRepository = sourceRepository.constructor === Repository ? new Repository(scopedOptions) : new ReadonlyRepository(scopedOptions);

    scopedRepositoriesBySource.set(sourceRepository, scopedRepository);
    scopedRegistry[modelNameLowered] = scopedRepository;
  }
}

function createScopedRepositories<TRepositories extends RepositoryMap>(sourceRepositories: readonly SourceRepository[], executor: ManagedTransactionExecutor): TransactionRepositories<TRepositories> {
  const scopedRepositoriesBySource = new Map<object, IReadonlyRepository<Entity>>();
  const scopedSourceRegistries = new Set<RepositoryRegistry>();

  for (const { options } of sourceRepositories) {
    if (scopedSourceRegistries.has(options.repositoriesByModelNameLowered)) {
      continue;
    }

    scopedSourceRegistries.add(options.repositoriesByModelNameLowered);
    createScopedRegistry(options.repositoriesByModelNameLowered, executor, scopedRepositoriesBySource);
  }

  const scopedRepositories: Record<string, IReadonlyRepository<Entity>> = {};
  for (const { name, repository } of sourceRepositories) {
    const scopedRepository = scopedRepositoriesBySource.get(repository);
    if (!scopedRepository) {
      throw new Error(`Unable to create a transaction-scoped repository for "${name}"`);
    }

    scopedRepositories[name] = scopedRepository;
  }

  return scopedRepositories as TransactionRepositories<TRepositories>;
}

async function applyTransactionSettings(connection: TransactionConnection, options: TransactionOptions<RepositoryMap>): Promise<void> {
  const settings: Record<string, string> = {};

  for (const optionName of TIMEOUT_OPTION_NAMES) {
    const value = options[optionName];
    if (value === undefined) {
      continue;
    }

    settings[POSTGRES_SETTING_BY_TIMEOUT_OPTION[optionName]] = `${value}ms`;
  }

  const queryAndParams = getTransactionSettingsQueryAndParams(settings);
  if (!queryAndParams) {
    return;
  }

  await connection.query(queryAndParams.query, queryAndParams.params);
}

function attachCleanupErrors(primaryError: unknown, cleanupErrors: readonly unknown[]): void {
  if (!(primaryError instanceof Error) || !cleanupErrors.length || !Object.isExtensible(primaryError)) {
    return;
  }

  const errorWithDetails: CleanupErrorDetails = primaryError;
  errorWithDetails.cleanupErrors = cleanupErrors;
}

async function cleanupFailedTransaction(connection: TransactionConnection, executor: ManagedTransactionExecutor, began: boolean, discardConnection: boolean): Promise<readonly unknown[]> {
  const cleanupErrors: unknown[] = [];

  executor.close();
  await executor.waitForOperations();

  let shouldDiscardConnection = discardConnection || !began;
  if (began) {
    try {
      await connection.query('ROLLBACK');
    } catch (error) {
      cleanupErrors.push(error);
      shouldDiscardConnection = true;
    }
  }

  try {
    await connection.release(shouldDiscardConnection || executor.hasConnectionFailure);
  } catch (error) {
    cleanupErrors.push(error);
  }

  return cleanupErrors;
}

export async function transaction<const TRepositories extends RepositoryMap, TResult>(
  options: TransactionOptions<TRepositories>,
  callback: (transactionScope: TransactionScope<TRepositories>) => PromiseLike<TResult> | TResult,
): Promise<Awaited<TResult>> {
  validateOptions(options);
  const beginQuery = getTransactionBeginQuery(options.isolationLevel);
  const sourceRepositories = resolveSourceRepositories(options.repositories, options.pool);

  const connection = await options.pool.connect();
  let began = false;
  let commitStarted = false;
  const executor = new ManagedTransactionExecutor(connection, options.pool);
  const onConnectionError = executor.failConnection.bind(executor);
  let callbackResult: Awaited<TResult>;

  try {
    try {
      if (connection.on && connection.removeListener) {
        connection.on('error', onConnectionError);
      }

      await connection.query(beginQuery);
      began = true;
      await applyTransactionSettings(connection, options);

      executor.throwIfFailed();

      const transactionScope = new TransactionScope(executor, createScopedRepositories<TRepositories>(sourceRepositories, executor));
      callbackResult = await callback(transactionScope);

      executor.throwIfFailed();

      if (executor.hasPendingOperations) {
        throw new Error('The transaction callback completed while database operations were still pending');
      }

      executor.close();
      commitStarted = true;
      await connection.query('COMMIT');
    } catch (error) {
      const cleanupErrors = await cleanupFailedTransaction(connection, executor, began, commitStarted || executor.hasConnectionFailure);
      attachCleanupErrors(error, cleanupErrors);
      throw error;
    }

    try {
      await connection.release(executor.hasConnectionFailure);
    } catch (error) {
      throw new Error('The transaction committed, but releasing its connection failed', { cause: error });
    }

    return callbackResult;
  } finally {
    connection.removeListener?.('error', onConnectionError);
  }
}
