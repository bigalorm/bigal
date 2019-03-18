import { WhereQuery } from './WhereQuery';

export interface DestroyResult<TEntity, TReturn> {
  where(args: WhereQuery): DestroyResult<TEntity, TReturn>;
  then(resolve: (thenableOrResult?: TReturn | PromiseLike<TReturn>) => void, reject: (err: Error) => void): Promise<void>;
}
