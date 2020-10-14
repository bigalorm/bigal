import type { ChainablePromiseLike } from '../ChainablePromiseLike';
import type { Entity } from '../Entity';

import type { PopulateArgs } from './PopulateArgs';
import type { WhereQuery } from './WhereQuery';

export interface FindOneResult<TEntity extends Entity> extends ChainablePromiseLike<TEntity | null> {
  where(args: WhereQuery): FindOneResult<TEntity>;
  populate(propertyName: Extract<keyof TEntity, string>, options?: PopulateArgs): FindOneResult<TEntity>;
  sort(value: string | Record<string, number | string>): FindOneResult<TEntity>;
}
