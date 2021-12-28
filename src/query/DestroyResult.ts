import type { Entity } from '../Entity';

import type { WhereQuery } from './WhereQuery';

export interface DestroyResult<TEntity extends Entity, TReturn> extends PromiseLike<TReturn> {
  where(args: WhereQuery<TEntity>): DestroyResult<TEntity, TReturn>;
}
