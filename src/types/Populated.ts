import type { Entity } from '../Entity.js';

import type { PickFunctions } from './PickFunctions.js';
import type { QueryResult } from './QueryResult.js';

/**
 * Removes primitives from specified properties and make non-optional. Allow singular Entity properties to be null.
 */
export type Populated<T extends Entity, K extends keyof T, TPropertyType extends Entity, TPropertyKeys extends keyof TPropertyType> = {
  [P in K]-?: Extract<T[P], Entity | Entity[]> extends Entity // Remove optional from property
    ? undefined extends T[P] // If property is not an array
      ? QueryResult<Pick<TPropertyType, TPropertyKeys | keyof PickFunctions<TPropertyType> | 'id'>> | null // If the property is originally optional, include null as a possible value type
      : QueryResult<Pick<TPropertyType, TPropertyKeys | keyof PickFunctions<TPropertyType> | 'id'>> // Otherwise, use the TPropertyType
    : QueryResult<Pick<TPropertyType, TPropertyKeys | keyof PickFunctions<TPropertyType> | 'id'>>[]; // Otherwise return an array of items
};
