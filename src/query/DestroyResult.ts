import type { Entity } from '../Entity.js';

import type { WhereQuery } from './WhereQuery.js';

export interface DestroyResult<TEntity extends Entity, TReturn> extends PromiseLike<TReturn> {
  where(args: WhereQuery<TEntity>): DestroyResult<TEntity, TReturn>;
}
