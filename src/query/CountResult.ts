import type { Entity } from '../Entity.js';

import type { WhereQuery } from './WhereQuery.js';

export interface CountResult<TEntity extends Entity> extends PromiseLike<number> {
  where(args: WhereQuery<TEntity>): CountResult<TEntity> | number;
}
