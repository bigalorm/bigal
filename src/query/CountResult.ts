import { WhereQuery } from './WhereQuery';

export interface CountResult<TEntity> {
  where(args: WhereQuery): CountResult<TEntity> | number;
  /* tslint:disable unified-signatures */
  then<U>(onFulfill: (value: number) => U | PromiseLike<U>, onReject?: (error: Error) => U | PromiseLike<U>): Promise<U>;
  then<U>(onFulfill: (value: number) => U | PromiseLike<U>, onReject?: (error: Error) => void | PromiseLike<void>): Promise<U>;
  /* tslint:enable unified-signatures */
}
