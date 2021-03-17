import type { ChainablePromiseLike } from '../ChainablePromiseLike';
import type { Entity } from '../Entity';

import type { PaginateOptions } from './PaginateOptions';
import type { Sort } from './Sort';
import type { WhereQuery } from './WhereQuery';

export interface FindResult<TEntity extends Entity, TReturn extends Entity> extends ChainablePromiseLike<TReturn[]> {
  where(args: WhereQuery<TEntity>): FindResult<TEntity, TReturn>;
  sort(value?: Sort<TEntity>): FindResult<TEntity, TReturn>;
  limit(value: number): FindResult<TEntity, TReturn>;
  skip(value: number): FindResult<TEntity, TReturn>;
  paginate(options: PaginateOptions): FindResult<TEntity, TReturn>;
}
