import type { ExcludeFunctions } from './ExcludeFunctions';

/**
 * Removes all functions
 */
export type OmitFunctions<T> = {
  [K in keyof T as ExcludeFunctions<T[K], K>]: T[K];
};
