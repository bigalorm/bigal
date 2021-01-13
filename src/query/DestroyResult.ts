import type { ChainablePromiseLike } from '../ChainablePromiseLike';

import type { WhereQueryTyped } from './WhereQuery';

export interface DestroyResult<TEntity, TReturn> extends ChainablePromiseLike<TReturn> {
  where(args: WhereQueryTyped<TEntity>): DestroyResult<TEntity, TReturn>;
}
