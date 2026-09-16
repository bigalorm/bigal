import { type PoolLike } from './PoolLike.js';

export interface TransactionConnection extends PoolLike {
  release(removeConnection?: boolean): Promise<void> | void;
}

export interface TransactionPool extends PoolLike {
  connect(): Promise<TransactionConnection>;
}
