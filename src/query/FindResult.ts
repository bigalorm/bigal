import { PaginateOptions } from './PaginateOptions';
import { WhereQuery } from './WhereQuery';
import { ChainablePromiseLike } from '../ChainablePromiseLike';

export interface FindResult<TEntity> extends ChainablePromiseLike<TEntity[]> {
  where(args: WhereQuery): FindResult<TEntity>;
  sort(value: string | object): FindResult<TEntity>;
  limit(value: number): FindResult<TEntity>;
  skip(value: number): FindResult<TEntity>;
  paginate(options: PaginateOptions): FindResult<TEntity>;
}
