import type { ChainablePromiseLike } from '../ChainablePromiseLike';

import type { PopulateArgs } from './PopulateArgs';
import type { WhereQueryTyped } from './WhereQuery';

export interface FindOneResult<TEntity> extends ChainablePromiseLike<TEntity | null> {
  where(args: WhereQueryTyped<TEntity>): FindOneResult<TEntity>;
  populate(propertyName: Extract<keyof TEntity, string>, options?: PopulateArgs): FindOneResult<TEntity>;
  sort(value: Record<string, number | string> | string): FindOneResult<TEntity>;
}
