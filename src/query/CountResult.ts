import type { ChainablePromiseLike } from '../ChainablePromiseLike';

import type { WhereQuery } from './WhereQuery';

export interface CountResult<TEntity> extends ChainablePromiseLike<number> {
  where(args: WhereQuery): CountResult<TEntity> | number;
}
