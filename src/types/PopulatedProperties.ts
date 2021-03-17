import type { Entity } from '../Entity';

/**
 * Removes primitives from all properties and make non-optional. Allow singular Entity properties to be null.
 */
export type PopulatedProperties<T> = {
  [P in keyof T]-?: Extract<T[P], Entity | Entity[]> extends Entity ? Extract<T[P], Entity | Entity[]> | null : Extract<T[P], Entity | Entity[]>;
};
