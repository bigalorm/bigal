import type { Entity } from '../Entity';

/**
 * Removes primitives from specified properties and make non-optional. Allow singular Entity properties to be null.
 */
export type Populated<T, K extends keyof T> = Omit<T, K> & {
  // Removes optional from property
  // If T[P] is not an array:
  //   If the property is originally optional, include null as a possible value type
  //   Otherwise, do not include null as a possible value type
  [P in K]-?: Extract<T[P], Entity | Entity[]> extends Entity
    ? undefined extends T[P]
      ? Exclude<Extract<T[P], Entity>, undefined> | null
      : Extract<T[P], Entity>
    : Exclude<Extract<T[P], Entity[]>, undefined>;
};
