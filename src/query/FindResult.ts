import { PaginateOptions } from './PaginateOptions';
import { WhereQuery } from './WhereQuery';

export interface FindResult<TEntity> {
  where(args: WhereQuery): FindResult<TEntity>;
  sort(value: string | object): FindResult<TEntity>;
  limit(value: number): FindResult<TEntity>;
  skip(value: number): FindResult<TEntity>;
  paginate(options: PaginateOptions): FindResult<TEntity>;
  then<U>(onFulfill: (value: TEntity[]) => U | PromiseLike<U>, onReject?: (error: Error) => U | PromiseLike<U>): Promise<U>;
  then<U>(onFulfill: (value: TEntity[]) => U | PromiseLike<U>, onReject?: (error: Error) => void | PromiseLike<void>): Promise<U>;
}
