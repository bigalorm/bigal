import type { WhereQuery } from './WhereQuery.js';

export interface CountResult<TEntity extends Record<string, unknown>> extends PromiseLike<number> {
  where(args: WhereQuery<TEntity>): CountResult<TEntity> | number;
}
