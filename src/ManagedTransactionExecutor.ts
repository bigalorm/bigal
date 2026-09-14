import { type PoolLike, type PoolQueryResult, type QueryResultRow, type TransactionConnection, type TransactionPool } from './types/index.js';

const executorsByScope = new WeakMap<PoolLike, ManagedTransactionExecutor>();

export class ManagedTransactionExecutor implements PoolLike {
  private readonly activeOperations = new Set<Promise<unknown>>();

  private readonly connection: TransactionConnection;

  private firstQueryFailure: Error | undefined;

  private isOpen = true;

  public readonly sourcePool: TransactionPool;

  public constructor(connection: TransactionConnection, sourcePool: TransactionPool) {
    this.connection = connection;
    this.sourcePool = sourcePool;
  }

  public get hasPendingOperations(): boolean {
    return Boolean(this.activeOperations.size);
  }

  public get queryFailure(): Error | undefined {
    return this.firstQueryFailure;
  }

  public close(): void {
    this.isOpen = false;
  }

  public query<TRow extends QueryResultRow = QueryResultRow>(text: string, values?: readonly unknown[]): Promise<PoolQueryResult<TRow>> {
    return this.trackOperation(async () => {
      try {
        return await this.connection.query<TRow>(text, values);
      } catch (error) {
        const queryError = error instanceof Error ? error : new Error('Database query failed', { cause: error });
        this.firstQueryFailure ??= queryError;
        throw queryError;
      }
    });
  }

  public trackOperation<TResult>(operation: () => Promise<TResult>): Promise<TResult> {
    if (!this.isOpen) {
      return Promise.reject(new Error('Cannot execute a query after the managed transaction scope has closed'));
    }

    const operationPromise = operation();
    this.activeOperations.add(operationPromise);
    void operationPromise.then(
      () => this.activeOperations.delete(operationPromise),
      () => this.activeOperations.delete(operationPromise),
    );

    return operationPromise;
  }

  public async waitForOperations(): Promise<void> {
    await Promise.allSettled(this.activeOperations);
  }
}

export function bindTransactionScope(scope: PoolLike, executor: ManagedTransactionExecutor): void {
  executorsByScope.set(scope, executor);
}

export function resolveManagedTransactionExecutor(pool: PoolLike): ManagedTransactionExecutor | undefined {
  if (pool instanceof ManagedTransactionExecutor) {
    return pool;
  }

  return executorsByScope.get(pool);
}
