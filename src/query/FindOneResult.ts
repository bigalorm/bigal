import type { ChainablePromiseLike } from '../ChainablePromiseLike';
import type { GetPropertyType } from '../types/GetPropertyType';

import type { PopulateArgs } from './PopulateArgs';
import type { Sort } from './Sort';
import type { WhereQuery } from './WhereQuery';

export interface FindOneResult<TEntity> extends ChainablePromiseLike<TEntity | null> {
  where(args: WhereQuery<TEntity>): FindOneResult<TEntity>;
  populate<TProperty extends string & keyof TEntity>(propertyName: TProperty, options?: PopulateArgs<GetPropertyType<TEntity, TProperty>>): FindOneResult<TEntity>;
  sort(value: Sort<TEntity>): FindOneResult<TEntity>;
}
