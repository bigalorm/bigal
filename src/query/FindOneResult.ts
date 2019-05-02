import { WhereQuery } from './WhereQuery';
import { PopulateArgs } from './PopulateArgs';
import { Entity } from '../Entity';

export interface FindOneResult<TEntity extends Entity> {
  where(args: WhereQuery): FindOneResult<TEntity>;
  populate(propertyName: Extract<keyof TEntity, string>, options?: PopulateArgs): FindOneResult<TEntity>;
  sort(value: string | object): FindOneResult<TEntity>;
  then(resolve: (thenableOrResult: (TEntity | null) | PromiseLike<TEntity | null>) => void, reject: (err: Error) => void): Promise<void>;
}
