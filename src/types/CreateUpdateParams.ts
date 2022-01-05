import type { Entity, NotEntityBrand } from '../Entity';

import type { ExcludeEntityCollections } from './ExcludeEntityCollections';
import type { ExcludeFunctions } from './ExcludeFunctions';

/**
 * Changes all Entity value properties to Primitive (string|number) | Pick<Entity, 'id'>
 */
export type CreateUpdateParams<T extends Entity> = {
  [K in keyof T as ExcludeEntityCollections<NonNullable<T[K]>, ExcludeFunctions<T[K], K>>]?: T[K] extends NotEntityBrand | undefined
    ? T[K]
    : Extract<T[K], Entity> extends Entity
    ? Exclude<T[K], Entity> | Pick<Extract<T[K], Entity>, 'id'>
    : T[K];
};
