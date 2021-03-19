import type { Entity } from '../Entity';

import type { EntityPrimitiveOrId } from './EntityPrimitiveOrId';
import type { ExcludeFunctionsAndEntityCollections } from './ExcludeFunctionsAndEntityCollections';
import type { QueryResponse } from './QueryResponse';

/**
 * Changes all Entity value properties to Primitive (string|number) | Pick<Entity, 'id'>
 */
export type CreateUpdateParams<T extends Entity> = {
  [K in keyof T as ExcludeFunctionsAndEntityCollections<T[K], K>]?: T[K] extends Entity ? EntityPrimitiveOrId<T[K]> | QueryResponse<Pick<T[K], 'id'>> : T[K];
};
