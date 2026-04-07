import type { PickFunctions } from './PickFunctions.js';
import type { QueryResult } from './QueryResult.js';

/**
 * Removes primitives from specified properties and makes them non-optional.
 * Allows singular entity properties to be null.
 */
export type Populated<T extends Record<string, unknown>, K extends keyof T, TPropertyType extends Record<string, unknown>, TPropertyKeys extends keyof TPropertyType> = {
  [P in K]-?: T[P] extends unknown[] | undefined
    ? QueryResult<Pick<TPropertyType, TPropertyKeys | keyof PickFunctions<TPropertyType>>>[]
    : undefined extends T[P]
      ? QueryResult<Pick<TPropertyType, TPropertyKeys | keyof PickFunctions<TPropertyType>>> | null
      : QueryResult<Pick<TPropertyType, TPropertyKeys | keyof PickFunctions<TPropertyType>>>;
};
