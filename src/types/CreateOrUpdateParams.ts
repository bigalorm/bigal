import type { EntityPrimitiveOrId } from './EntityPrimitiveOrId';
import type { ExcludeFunctionsAndEntityCollections } from './ExcludeFunctionsAndEntityCollections';

/**
 * Changes all Entity value properties to Primitive (string|number) | Pick<Entity, 'id'>
 */
export type CreateOrUpdateParams<T> = {
  [K in keyof T as K extends '__bigAlEntity' ? never : ExcludeFunctionsAndEntityCollections<T[K], K>]?: EntityPrimitiveOrId<T[K]>;
};
