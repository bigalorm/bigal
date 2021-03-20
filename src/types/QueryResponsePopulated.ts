import type { Entity } from '../Entity';

import type { PickAsPopulated } from './PickAsPopulated';
import type { QueryResponse } from './QueryResponse';

/**
 * Allows a QueryResponse type with specific populated properties
 */
export type QueryResponsePopulated<T extends Entity, K extends keyof T> = Extract<Omit<QueryResponse<T>, K> & PickAsPopulated<T, K>, T>;
