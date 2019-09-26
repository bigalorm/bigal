import { WhereQuery } from './WhereQuery';
import { PopulateArgs } from './PopulateArgs';
import { Entity } from '../Entity';

export interface FindOneResult<TEntity extends Entity> {
  where(args: WhereQuery): FindOneResult<TEntity>;
  populate(propertyName: Extract<keyof TEntity, string>, options?: PopulateArgs): FindOneResult<TEntity>;
  sort(value: string | object): FindOneResult<TEntity>;
  then<U>(onFulfill: (value: TEntity | null) => U | PromiseLike<U>, onReject?: (error: Error) => U | PromiseLike<U>): Promise<U>;
  then<U>(onFulfill: (value: TEntity | null) => U | PromiseLike<U>, onReject?: (error: Error) => void | PromiseLike<void>): Promise<U>;
}
