import type { Populated } from './Populated';
import type { QueryResponse } from './QueryResponse';

/**
 * Allows a QueryResponse type with specific populated properties
 */
export type QueryResponsePopulated<T, K extends keyof T> = Populated<T, K> & QueryResponse<Omit<T, K>>;
