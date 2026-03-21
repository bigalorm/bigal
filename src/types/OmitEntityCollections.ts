import type { ExcludeEntityCollections } from './ExcludeEntityCollections.js';

/**
 * In the new schema API, collections are already excluded by InferSelect.
 * This type is preserved as a passthrough for backward compatibility.
 */
export type OmitEntityCollections<T> = {
  [K in keyof T as ExcludeEntityCollections<T[K], K>]: T[K];
};
