import type { ChainablePromiseLike } from '../ChainablePromiseLike';
import type { Entity } from '../Entity';

import type { WhereQuery } from './WhereQuery';

export interface DestroyResult<TEntity extends Entity, TReturn> extends ChainablePromiseLike<TReturn> {
  where(args: WhereQuery<TEntity>): DestroyResult<TEntity, TReturn>;
}
