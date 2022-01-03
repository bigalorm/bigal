import type { ExcludeFunctionsAndEntityCollections } from './ExcludeFunctionsAndEntityCollections';

/**
 * Removes all functions and entity collection properties
 */
export type OmitFunctionsAndEntityCollections<T> = {
  [K in keyof T as ExcludeFunctionsAndEntityCollections<T[K], K>]: T[K];
};

/*
export type OmitFunctionsAndEntityCollections<T, K extends keyof T> = {
  [P in K as ExcludeFunctionsAndEntityCollections<T[P], P>]: T[P];
};
 */
