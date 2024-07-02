import type { ExcludeFunctions } from './ExcludeFunctions.js';

/**
 * Removes all functions
 */
export type OmitFunctions<T> = {
  [K in keyof T as ExcludeFunctions<T[K], K>]: T[K];
};
