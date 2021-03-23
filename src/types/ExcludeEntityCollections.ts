import type { Entity, NotEntityBrand } from '../Entity';

/**
 * Removes all entity collection properties. To be used as a re-map key function
 */
export type ExcludeEntityCollections<T, K extends PropertyKey> = T extends NotEntityBrand[] | undefined ? K : T extends Entity[] | undefined ? never : K;
