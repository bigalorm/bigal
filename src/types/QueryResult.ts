import type { Entity, NotEntityBrand } from '../Entity';

import type { ExcludeEntityCollections } from './ExcludeEntityCollections';

/**
 * Changes all properties with Entity values to Primitive (string|number). Removes any properties that with values
 * of Entity arrays
 */
export type QueryResult<T extends Entity> = Extract<
  {
    [K in keyof T as ExcludeEntityCollections<NonNullable<T[K]>, K>]: T[K] extends NotEntityBrand | undefined ? T[K] : Exclude<T[K], Entity>;
  },
  T
>;
