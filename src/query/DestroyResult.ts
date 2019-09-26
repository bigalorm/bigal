import { WhereQuery } from './WhereQuery';

export interface DestroyResult<TEntity, TReturn> {
  where(args: WhereQuery): DestroyResult<TEntity, TReturn>;
  then<U>(onFulfill: (value: TReturn) => U | PromiseLike<U>, onReject?: (error: Error) => U | PromiseLike<U>): Promise<U>;
  then<U>(onFulfill: (value: TReturn) => U | PromiseLike<U>, onReject?: (error: Error) => void | PromiseLike<void>): Promise<U>;
}
