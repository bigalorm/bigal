import type { ChainablePromiseLike } from '../ChainablePromiseLike';

import type { PaginateOptions } from './PaginateOptions';
import type { Sort } from './Sort';
import type { WhereQuery } from './WhereQuery';

export interface FindResult<TEntity> extends ChainablePromiseLike<TEntity[]> {
  where(args: WhereQuery<TEntity>): FindResult<TEntity>;
  sort(value: Sort<TEntity>): FindResult<TEntity>;
  limit(value: number): FindResult<TEntity>;
  skip(value: number): FindResult<TEntity>;
  paginate(options: PaginateOptions): FindResult<TEntity>;
}
