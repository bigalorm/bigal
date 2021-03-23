import type { Entity, NotEntityBrand } from '../Entity';

import type { EntityPrimitiveOrId } from './EntityPrimitiveOrId';
import type { ExcludeFunctionsAndEntityCollections } from './ExcludeFunctionsAndEntityCollections';
import type { QueryResponse } from './QueryResponse';

/**
 * Changes all Entity value properties to Primitive (string|number) | Pick<Entity, 'id'>
 */
export type CreateUpdateParams<T extends Entity> = {
  [K in keyof T as ExcludeFunctionsAndEntityCollections<T[K], K>]?: T[K] extends NotEntityBrand | undefined
    ? T[K]
    : T[K] extends Entity
    ? EntityPrimitiveOrId<T[K]> | Pick<QueryResponse<T[K]>, 'id'>
    : T[K];
};
