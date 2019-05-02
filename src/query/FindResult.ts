import { PaginateOptions } from './PaginateOptions';
import { WhereQuery } from './WhereQuery';

export interface FindResult<TEntity> {
  where(args: WhereQuery): FindResult<TEntity>;
  sort(value: string | object): FindResult<TEntity>;
  limit(value: number): FindResult<TEntity>;
  skip(value: number): FindResult<TEntity>;
  paginate(options: PaginateOptions): FindResult<TEntity>;
  then(resolve: (thenableOrResult: TEntity[] | PromiseLike<TEntity[]>) => void, reject: (err: Error) => void): Promise<void>;
}
