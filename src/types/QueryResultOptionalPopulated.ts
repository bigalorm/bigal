import type { Entity } from '../Entity.js';

import type { EntityPrimitiveOrId } from './EntityPrimitiveOrId.js';
import type { QueryResult } from './QueryResult.js';

/**
 * Allows a QueryResult type with specific properties optionally populated. If the property is populated, only the id property is needed
 */
export type QueryResultOptionalPopulated<T extends Entity, K extends keyof T> = Omit<QueryResult<T>, K> & {
  [P in K]-?: T[P] extends []
    ? undefined extends T[P] // If property is not an array
      ? EntityPrimitiveOrId<T[P]> | null // If the property is originally optional, include null as a possible value type
      : EntityPrimitiveOrId<T[P]> // Otherwise, use the TPropertyType
    : EntityPrimitiveOrId<T[P]>; // Otherwise return an array of items
};
