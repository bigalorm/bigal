import type { Entity, NotEntityBrand } from '../Entity.js';

import type { ExcludeEntityCollections } from './ExcludeEntityCollections.js';
import type { ExcludeFunctions } from './ExcludeFunctions.js';

/**
 * Changes all Entity value properties to Primitive (string|number) | Pick<Entity, 'id'>
 */
export type CreateUpdateParams<T extends Entity> = {
  [K in keyof T as ExcludeEntityCollections<NonNullable<T[K]>, ExcludeFunctions<T[K], K>>]?: T[K] extends NotEntityBrand | undefined
    ? T[K]
    : Extract<T[K], Entity> extends undefined
      ? T[K]
      : Exclude<T[K], Entity> | Pick<Extract<T[K], Entity>, 'id'>;
};
