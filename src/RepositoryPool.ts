import { resolveManagedTransactionExecutor } from './ManagedTransactionExecutor.js';
import { type PoolLike } from './types/index.js';

export function resolvePopulatePool(parentPool: PoolLike, override: PoolLike | undefined): PoolLike | undefined {
  const executor = resolveManagedTransactionExecutor(parentPool);
  if (!executor) {
    return override;
  }

  if (override && resolveManagedTransactionExecutor(override) !== executor) {
    throw new Error('A read in a managed transaction cannot populate using a different pool');
  }

  return executor;
}

function resolveRepositoryPool(defaultPool: PoolLike, sourceWritePool: PoolLike, override: PoolLike | undefined): PoolLike {
  if (!override) {
    return defaultPool;
  }

  const defaultExecutor = resolveManagedTransactionExecutor(defaultPool);
  const overrideExecutor = resolveManagedTransactionExecutor(override);

  if (defaultExecutor) {
    if (overrideExecutor !== defaultExecutor) {
      throw new Error('A repository scoped to a managed transaction cannot use a different pool');
    }

    return defaultExecutor;
  }

  if (!overrideExecutor) {
    return override;
  }

  if (overrideExecutor.sourcePool !== sourceWritePool) {
    throw new Error('The repository belongs to a different connection than the managed transaction');
  }

  return overrideExecutor;
}

export function executeRepositoryOperation<TResult>(
  defaultPool: PoolLike,
  sourceWritePool: PoolLike,
  override: PoolLike | undefined,
  operation: (pool: PoolLike) => Promise<TResult>,
): Promise<TResult> {
  const pool = resolveRepositoryPool(defaultPool, sourceWritePool, override);
  const executor = resolveManagedTransactionExecutor(pool);
  if (!executor) {
    return operation(pool);
  }

  return executor.trackOperation(async () => operation(executor));
}
