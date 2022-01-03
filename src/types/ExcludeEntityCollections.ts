import type { Entity, NotEntityBrand } from '../Entity';

/**
 * Removes all entity collection properties. To be used as a re-map key function
 */
export type ExcludeEntityCollections<T, K extends PropertyKey> = T extends NotEntityBrand[] | undefined
  ? K // Return the key if collection is NotEntityBrand
  : T extends Entity[] | undefined
  ? never // If T is an entity array, remove
  : K; // Otherwise, return the key
