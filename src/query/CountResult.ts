import type { ChainablePromiseLike } from '../ChainablePromiseLike';

import type { WhereQueryTyped } from './WhereQuery';

export interface CountResult<TEntity> extends ChainablePromiseLike<number> {
  where(args: WhereQueryTyped<TEntity>): CountResult<TEntity> | number;
}
