import type { ChainablePromiseLike } from '../ChainablePromiseLike';

import type { PaginateOptions } from './PaginateOptions';
import type { WhereQueryTyped } from './WhereQuery';

export interface FindResult<TEntity> extends ChainablePromiseLike<TEntity[]> {
  where(args: WhereQueryTyped<TEntity>): FindResult<TEntity>;
  sort(value: Record<string, number | string> | string): FindResult<TEntity>;
  limit(value: number): FindResult<TEntity>;
  skip(value: number): FindResult<TEntity>;
  paginate(options: PaginateOptions): FindResult<TEntity>;
}
