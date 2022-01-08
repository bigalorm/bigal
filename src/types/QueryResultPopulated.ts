import type { Entity } from '../Entity';

import type { GetValueType } from './GetValueType';
import type { QueryResult } from './QueryResult';

/**
 * Allows a QueryResult type with specific populated properties
 */
export type QueryResultPopulated<T extends Entity, K extends keyof T> = Omit<QueryResult<T>, K> & {
  // NOTE: This is very similar to Populated. Main difference is that it calls GetValueType<> for each key specified and does not support sub selects
  [P in K]-?: Extract<T[P], Entity | Entity[]> extends Entity // Remove optional from property
    ? undefined extends T[P] // If property is not an array
      ? QueryResult<GetValueType<T[P], Entity>> | null // If the property is originally optional, include null as a possible value type
      : QueryResult<GetValueType<T[P], Entity>> // Otherwise, use the TPropertyType
    : QueryResult<GetValueType<T[P], Entity>>[]; // Otherwise return an array of items
};
