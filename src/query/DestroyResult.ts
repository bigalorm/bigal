import { WhereQuery } from './WhereQuery';

export interface DestroyResult<TEntity, TReturn> {
  where(args: WhereQuery): DestroyResult<TEntity, TReturn>;
  /* tslint:disable unified-signatures */
  then<U>(onFulfill: (value: TReturn) => U | PromiseLike<U>, onReject?: (error: Error) => U | PromiseLike<U>): Promise<U>;
  then<U>(onFulfill: (value: TReturn) => U | PromiseLike<U>, onReject?: (error: Error) => void | PromiseLike<void>): Promise<U>;
  /* tslint:enable unified-signatures */
}
