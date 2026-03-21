import type { EntityPrimitiveOrId } from './EntityPrimitiveOrId.js';
import type { QueryResult } from './QueryResult.js';

/**
 * Allows a QueryResult type with specific properties optionally populated.
 * In the new schema API, property types are already resolved by InferSelect.
 */
export type QueryResultOptionalPopulated<T extends Record<string, unknown>, K extends keyof T> = Omit<QueryResult<T>, K> & {
  [P in K]-?: T[P] extends [] ? (undefined extends T[P] ? EntityPrimitiveOrId<T[P]> | null : EntityPrimitiveOrId<T[P]>) : EntityPrimitiveOrId<T[P]>;
};
