import type { ChainablePromiseLike } from '../ChainablePromiseLike';

import type { PaginateOptions } from './PaginateOptions';
import type { WhereQuery } from './WhereQuery';

export interface FindResult<TEntity> extends ChainablePromiseLike<TEntity[]> {
  where(args: WhereQuery): FindResult<TEntity>;
  sort(value: Record<string, number | string> | string): FindResult<TEntity>;
  limit(value: number): FindResult<TEntity>;
  skip(value: number): FindResult<TEntity>;
  paginate(options: PaginateOptions): FindResult<TEntity>;
}
