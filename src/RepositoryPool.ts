import { ManagedTransactionExecutor } from './ManagedTransactionExecutor.js';
import { type PoolLike } from './types/index.js';

export function getRepositoryPool(defaultPool: PoolLike, sourceWritePool: PoolLike, sourceRepositoryRegistry: object, override?: PoolLike): PoolLike {
  if (!override) {
    return defaultPool;
  }

  if (defaultPool instanceof ManagedTransactionExecutor) {
    if (override !== defaultPool) {
      throw new Error('A repository scoped to a managed transaction cannot use a different pool');
    }

    return defaultPool;
  }

  if (override instanceof ManagedTransactionExecutor) {
    if (override.sourcePool !== sourceWritePool) {
      throw new Error('The repository belongs to a different connection than the managed transaction');
    }

    if (override.sourceRepositoryRegistry !== sourceRepositoryRegistry) {
      throw new Error('The repository belongs to a different BigAl initialization than the managed transaction');
    }
  }

  return override;
}

export function isManagedTransactionPool(pool: PoolLike): boolean {
  return pool instanceof ManagedTransactionExecutor;
}

export function trackRepositoryOperation<TResult>(pool: PoolLike, operation: () => Promise<TResult>): Promise<TResult> {
  if (pool instanceof ManagedTransactionExecutor) {
    return pool.trackOperation(operation);
  }

  return operation();
}

export function executeRepositoryOperation<TResult>(
  defaultPool: PoolLike,
  sourceWritePool: PoolLike,
  sourceRepositoryRegistry: object,
  override: PoolLike | undefined,
  operation: (pool: PoolLike) => Promise<TResult>,
): Promise<TResult> {
  const pool = getRepositoryPool(defaultPool, sourceWritePool, sourceRepositoryRegistry, override);
  return trackRepositoryOperation(pool, async () => operation(pool));
}
