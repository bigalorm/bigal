import type { IncludeFunctions } from './IncludeFunctions.js';

export type PickFunctions<T> = {
  [K in keyof T as IncludeFunctions<T[K], K>]: T[K];
};
