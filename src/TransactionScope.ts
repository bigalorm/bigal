import { type IReadonlyRepository } from './IReadonlyRepository.js';
import { type IRepository } from './IRepository.js';
import { bindTransactionScope, type ManagedTransactionExecutor } from './ManagedTransactionExecutor.js';
import { type ReadonlyRepository } from './ReadonlyRepository.js';
import { type Repository } from './Repository.js';
import { type PoolLike, type PoolQueryResult, type QueryResultRow } from './types/index.js';

export type RepositoryMap = Record<string, unknown>;

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

export type TransactionRepositories<TRepositories extends RepositoryMap> = {
  [TKey in keyof TRepositories]: ScopedRepository<TRepositories[TKey]>;
};

export class TransactionScope<TRepositories extends RepositoryMap> implements PoolLike {
  private readonly executor: ManagedTransactionExecutor;

  public readonly repositories: TransactionRepositories<TRepositories>;

  public constructor(executor: ManagedTransactionExecutor, repositories: TransactionRepositories<TRepositories>) {
    this.executor = executor;
    this.repositories = repositories;
    bindTransactionScope(this, executor);
  }

  public query<TRow extends QueryResultRow = QueryResultRow>(text: string, values?: readonly unknown[]): Promise<PoolQueryResult<TRow>> {
    return this.executor.query<TRow>(text, values);
  }
}
