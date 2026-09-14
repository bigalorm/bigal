import { type PoolLike, type PoolQueryResult, type QueryResultRow, type TransactionConnection, type TransactionPool } from './types/index.js';

type TransactionState = 'closed' | 'closing' | 'open';

export class ManagedTransactionExecutor implements PoolLike {
  private readonly activeOperations = new Set<Promise<unknown>>();

  private readonly connection: TransactionConnection;

  private firstQueryFailure: Error | undefined;

  private repositoriesByName: Record<string, unknown> = {};

  private state: TransactionState = 'open';

  public readonly sourcePool: TransactionPool;

  public readonly sourceRepositoryRegistry: object | undefined;

  public constructor(connection: TransactionConnection, sourcePool: TransactionPool, sourceRepositoryRegistry: object | undefined) {
    this.connection = connection;
    this.sourcePool = sourcePool;
    this.sourceRepositoryRegistry = sourceRepositoryRegistry;
  }

  public get hasPendingOperations(): boolean {
    return Boolean(this.activeOperations.size);
  }

  public get queryFailure(): Error | undefined {
    return this.firstQueryFailure;
  }

  public get repositories(): Record<string, unknown> {
    return this.repositoriesByName;
  }

  public bindRepositories(repositories: Record<string, unknown>): void {
    this.repositoriesByName = repositories;
  }

  public close(): void {
    this.state = 'closing';
  }

  public finish(): void {
    this.state = 'closed';
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
    if (this.state !== 'open') {
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
