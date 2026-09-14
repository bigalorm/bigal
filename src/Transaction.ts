import { type Entity } from './Entity.js';
import { type IReadonlyRepository } from './IReadonlyRepository.js';
import { type IRepository } from './IRepository.js';
import { ManagedTransactionExecutor } from './ManagedTransactionExecutor.js';
import { ReadonlyRepository } from './ReadonlyRepository.js';
import { Repository } from './Repository.js';
import { getRepositoryOptions } from './RepositoryInternals.js';
import { type PoolLike, type TransactionConnection, type TransactionPool } from './types/index.js';

const MAX_POSTGRES_TIMEOUT_MS = 2_147_483_647;

const ISOLATION_LEVEL_SQL: Record<TransactionIsolationLevel, string> = {
  readCommitted: 'READ COMMITTED',
  repeatableRead: 'REPEATABLE READ',
  serializable: 'SERIALIZABLE',
};

interface CleanupErrorDetails extends Error {
  cleanupErrors?: readonly unknown[];
}

type RepositoryMap = Record<string, unknown>;

type ScopedRepository<TRepository> =
  TRepository extends Repository<infer TEntity>
    ? Repository<TEntity>
    : TRepository extends ReadonlyRepository<infer TEntity>
      ? ReadonlyRepository<TEntity>
      : TRepository extends IRepository<infer TEntity>
        ? IRepository<TEntity>
        : TRepository extends IReadonlyRepository<infer TEntity>
          ? IReadonlyRepository<TEntity>
          : never;

export type TransactionIsolationLevel = 'readCommitted' | 'repeatableRead' | 'serializable';

export type TransactionRepositories<TRepositories extends RepositoryMap> = {
  [TKey in keyof TRepositories]: ScopedRepository<TRepositories[TKey]>;
};

export interface TransactionScope<TRepositories extends RepositoryMap> extends PoolLike {
  readonly repositories: TransactionRepositories<TRepositories>;
}

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
  assertTimeoutValue('idleInTransactionTimeoutMs', options.idleInTransactionTimeoutMs);
  assertTimeoutValue('lockTimeoutMs', options.lockTimeoutMs);
  assertTimeoutValue('statementTimeoutMs', options.statementTimeoutMs);

  if (options.isolationLevel !== undefined && !Object.hasOwn(ISOLATION_LEVEL_SQL, options.isolationLevel)) {
    throw new RangeError(`Unsupported transaction isolation level: ${String(options.isolationLevel)}`);
  }

  if (options.pool instanceof ManagedTransactionExecutor) {
    throw new Error('A managed transaction cannot be started from another managed transaction scope');
  }
}

function isStandardRepository(repository: unknown): repository is ReadonlyRepository<Entity> | Repository<Entity> {
  if (typeof repository !== 'object' || !repository) {
    return false;
  }

  return repository.constructor === ReadonlyRepository || repository.constructor === Repository;
}

function validateRepositories(repositories: RepositoryMap, pool: TransactionPool): object | undefined {
  let sourceRegistry: object | undefined;

  for (const [name, repository] of Object.entries(repositories)) {
    if (!isStandardRepository(repository)) {
      throw new TypeError(`Transaction repository "${name}" must be a standard Repository or ReadonlyRepository instance`);
    }

    const repositoryOptions = getRepositoryOptions(repository);
    if (!repositoryOptions) {
      throw new TypeError(`Unable to read the initialized configuration for transaction repository "${name}"`);
    }

    if (repositoryOptions.pool !== pool) {
      throw new Error(`Transaction repository "${name}" belongs to a different connection than the transaction pool`);
    }

    sourceRegistry ??= repositoryOptions.repositoriesByModelNameLowered;
    if (sourceRegistry !== repositoryOptions.repositoriesByModelNameLowered) {
      throw new Error('All transaction repositories must come from the same BigAl initialization');
    }
  }

  return sourceRegistry;
}

function createScopedRepositories<TRepositories extends RepositoryMap>(repositories: TRepositories, executor: ManagedTransactionExecutor): TransactionRepositories<TRepositories> {
  const firstRepository = Object.values(repositories)[0];
  if (!firstRepository) {
    const emptyRepositories = {} as TransactionRepositories<TRepositories>;
    executor.bindRepositories(emptyRepositories);
    return emptyRepositories;
  }

  if (!isStandardRepository(firstRepository)) {
    throw new TypeError('Unable to read the initialized repository configuration');
  }

  const firstRepositoryOptions = getRepositoryOptions(firstRepository);
  if (!firstRepositoryOptions) {
    throw new TypeError('Unable to read the initialized repository configuration');
  }

  const scopedRegistry: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>> = {};
  const scopedRepositoriesBySource = new Map<object, IReadonlyRepository<Entity>>();

  for (const sourceRepository of Object.values(firstRepositoryOptions.repositoriesByModelNameLowered)) {
    if (scopedRepositoriesBySource.has(sourceRepository) || !isStandardRepository(sourceRepository)) {
      continue;
    }

    const sourceOptions = getRepositoryOptions(sourceRepository);
    if (!sourceOptions || sourceOptions.pool !== executor.sourcePool) {
      continue;
    }

    const repositoryOptions = {
      modelMetadata: sourceOptions.modelMetadata,
      type: sourceOptions.type,
      repositoriesByModelNameLowered: scopedRegistry,
      pool: executor,
      readonlyPool: executor,
    };
    const scopedRepository = sourceRepository.constructor === Repository ? new Repository(repositoryOptions) : new ReadonlyRepository(repositoryOptions);

    scopedRepositoriesBySource.set(sourceRepository, scopedRepository);
    scopedRegistry[sourceRepository.model.name.toLowerCase()] = scopedRepository;
  }

  const scopedRepositories: Record<string, unknown> = {};
  for (const [name, sourceRepository] of Object.entries(repositories)) {
    if (!isStandardRepository(sourceRepository)) {
      throw new TypeError(`Transaction repository "${name}" must be a standard Repository or ReadonlyRepository instance`);
    }

    const scopedRepository = scopedRepositoriesBySource.get(sourceRepository);
    if (!scopedRepository) {
      throw new Error(`Unable to create a transaction-scoped repository for "${name}"`);
    }

    scopedRepositories[name] = scopedRepository;
  }

  const typedRepositories = scopedRepositories as TransactionRepositories<TRepositories>;
  executor.bindRepositories(typedRepositories);
  return typedRepositories;
}

function getBeginStatement(isolationLevel: TransactionIsolationLevel | undefined): string {
  if (!isolationLevel) {
    return 'BEGIN';
  }

  return `BEGIN ISOLATION LEVEL ${ISOLATION_LEVEL_SQL[isolationLevel]}`;
}

async function setLocalTimeout(connection: TransactionConnection, setting: string, value: number | undefined): Promise<void> {
  if (value === undefined) {
    return;
  }

  await connection.query('SELECT set_config($1, $2, true)', [setting, `${value}ms`]);
}

async function applyTransactionSettings(connection: TransactionConnection, options: TransactionOptions<RepositoryMap>): Promise<void> {
  await setLocalTimeout(connection, 'lock_timeout', options.lockTimeoutMs);
  await setLocalTimeout(connection, 'statement_timeout', options.statementTimeoutMs);
  await setLocalTimeout(connection, 'idle_in_transaction_session_timeout', options.idleInTransactionTimeoutMs);
}

function attachCleanupErrors(primaryError: unknown, cleanupErrors: readonly unknown[]): void {
  if (!(primaryError instanceof Error) || !cleanupErrors.length || !Object.isExtensible(primaryError)) {
    return;
  }

  const errorWithDetails: CleanupErrorDetails = primaryError;
  errorWithDetails.cleanupErrors = cleanupErrors;
}

async function cleanupFailedTransaction(connection: TransactionConnection, executor: ManagedTransactionExecutor | undefined, began: boolean, discardConnection: boolean): Promise<readonly unknown[]> {
  const cleanupErrors: unknown[] = [];

  executor?.close();
  await executor?.waitForOperations();
  executor?.finish();

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
    await connection.release(shouldDiscardConnection);
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
  const sourceRepositoryRegistry = validateRepositories(options.repositories, options.pool);

  const connection = await options.pool.connect();
  let began = false;
  let commitStarted = false;
  let executor: ManagedTransactionExecutor | undefined;
  let callbackResult: Awaited<TResult>;

  try {
    await connection.query(getBeginStatement(options.isolationLevel));
    began = true;
    await applyTransactionSettings(connection, options);

    executor = new ManagedTransactionExecutor(connection, options.pool, sourceRepositoryRegistry);
    createScopedRepositories(options.repositories, executor);
    callbackResult = await callback(executor as TransactionScope<TRepositories>);
    await Promise.resolve();

    if (executor.queryFailure) {
      throw executor.queryFailure;
    }

    if (executor.hasPendingOperations) {
      throw new Error('The transaction callback completed while database operations were still pending');
    }

    executor.close();
    commitStarted = true;
    await connection.query('COMMIT');
    executor.finish();
  } catch (error) {
    const cleanupErrors = await cleanupFailedTransaction(connection, executor, began, commitStarted);
    attachCleanupErrors(error, cleanupErrors);
    throw error;
  }

  try {
    await connection.release(false);
  } catch (error) {
    throw new Error('The transaction committed, but releasing its connection failed', { cause: error });
  }

  return callbackResult;
}
