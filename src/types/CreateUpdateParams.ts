import type { Entity, NotEntityBrand } from '../Entity';

import type { EntityPrimitiveOrId } from './EntityPrimitiveOrId';
import type { ExcludeEntityCollections } from './ExcludeEntityCollections';
import type { ExcludeFunctions } from './ExcludeFunctions';

/**
 * Changes all Entity value properties to Primitive (string|number) | Pick<Entity, 'id'>
 */
export type CreateUpdateParams<T extends Entity> = {
  [K in keyof T as ExcludeEntityCollections<NonNullable<T[K]>, ExcludeFunctions<T[K], K>>]?: T[K] extends NotEntityBrand | undefined
    ? T[K]
    : T[K] extends Entity
    ? EntityPrimitiveOrId<T[K]> | { id: unknown }
    : T[K];
};
