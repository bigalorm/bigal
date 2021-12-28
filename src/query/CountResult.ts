import type { Entity } from '../Entity';

import type { WhereQuery } from './WhereQuery';

export interface CountResult<TEntity extends Entity> extends PromiseLike<number> {
  where(args: WhereQuery<TEntity>): CountResult<TEntity> | number;
}
