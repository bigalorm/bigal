import type { ExcludeEntityCollections } from './ExcludeEntityCollections';

/**
 * Removes all entity collection properties
 */
export type OmitEntityCollections<T> = {
  [K in keyof T as ExcludeEntityCollections<T[K], K>]: T[K];
};
