import type { ChainablePromiseLike } from '../ChainablePromiseLike';

import type { WhereQuery } from './WhereQuery';

export interface DestroyResult<TEntity, TReturn> extends ChainablePromiseLike<TReturn> {
  where(args: WhereQuery<TEntity>): DestroyResult<TEntity, TReturn>;
}
