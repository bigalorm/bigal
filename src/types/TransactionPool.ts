import { type PoolLike } from './PoolLike.js';

export interface TransactionConnection extends PoolLike {
  release(removeConnection?: boolean): Promise<void> | void;
  on?(event: 'error', listener: (error: Error) => void): unknown;
  removeListener?(event: 'error', listener: (error: Error) => void): unknown;
}

export interface TransactionPool extends PoolLike {
  connect(): Promise<TransactionConnection>;
}
