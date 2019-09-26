import { WhereQuery } from './WhereQuery';

export interface CountResult<TEntity> {
  where(args: WhereQuery): CountResult<TEntity> | number;
  then<U>(onFulfill: (value: number) => U | PromiseLike<U>, onReject?: (error: Error) => U | PromiseLike<U>): Promise<U>;
  then<U>(onFulfill: (value: number) => U | PromiseLike<U>, onReject?: (error: Error) => void | PromiseLike<void>): Promise<U>;
}
