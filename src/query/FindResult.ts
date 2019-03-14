import { PaginateOptions } from './PaginateOptions';
import { WhereQuery } from './WhereQuery';

export interface FindResult<TEntity> {
  where: (args: WhereQuery) => FindResult<TEntity> | TEntity[];
  sort: (value: string | object) => FindResult<TEntity> | TEntity[];
  limit: (value: number) => FindResult<TEntity> | TEntity[];
  skip: (value: number) => FindResult<TEntity> | TEntity[];
  paginate: (options: PaginateOptions) => FindResult<TEntity> | TEntity[];
  then: (resolve: (thenableOrResult?: TEntity[] | PromiseLike<TEntity[]>) => void, reject: (err: Error) => void) => Promise<void>;
}
