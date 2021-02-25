import type { ChainablePromiseLike } from '../ChainablePromiseLike';
import type { Entity } from '../Entity';

import type { PaginateOptions } from './PaginateOptions';
import type { Sort } from './Sort';
import type { WhereQuery } from './WhereQuery';

export interface FindResult<TEntity extends Entity> extends ChainablePromiseLike<TEntity[]> {
  where(args: WhereQuery<TEntity>): FindResult<TEntity>;
  sort(value?: Sort<TEntity>): FindResult<TEntity>;
  limit(value: number): FindResult<TEntity>;
  skip(value: number): FindResult<TEntity>;
  paginate(options: PaginateOptions): FindResult<TEntity>;
}
