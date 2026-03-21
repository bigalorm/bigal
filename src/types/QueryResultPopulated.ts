import type { GetValueType } from './GetValueType.js';
import type { QueryResult } from './QueryResult.js';

/**
 * Allows a QueryResult type with specific populated properties.
 * In the new schema API, populated properties resolve to the related entity's select type.
 */
export type QueryResultPopulated<T extends Record<string, unknown>, K extends keyof T> = Omit<QueryResult<T>, K> & {
  [P in K]-?: T[P] extends unknown[]
    ? QueryResult<GetValueType<T[P], Record<string, unknown>>>[]
    : undefined extends T[P]
      ? QueryResult<GetValueType<T[P], Record<string, unknown>>> | null
      : QueryResult<GetValueType<T[P], Record<string, unknown>>>;
};
