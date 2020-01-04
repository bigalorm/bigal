import { WhereQuery } from './WhereQuery';
import { PopulateArgs } from './PopulateArgs';
import { Entity } from '../Entity';
import { ChainablePromiseLike } from '../ChainablePromiseLike';

export interface FindOneResult<TEntity extends Entity> extends ChainablePromiseLike<TEntity | null> {
  where(args: WhereQuery): FindOneResult<TEntity>;
  populate(propertyName: Extract<keyof TEntity, string>, options?: PopulateArgs): FindOneResult<TEntity>;
  sort(value: string | object): FindOneResult<TEntity>;
}
