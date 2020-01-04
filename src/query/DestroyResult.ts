import { WhereQuery } from './WhereQuery';
import { ChainablePromiseLike } from '../ChainablePromiseLike';

export interface DestroyResult<TEntity, TReturn> extends ChainablePromiseLike<TReturn> {
  where(args: WhereQuery): DestroyResult<TEntity, TReturn>;
}
