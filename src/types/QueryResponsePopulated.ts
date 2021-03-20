import type { Entity } from '../Entity';

import type { PickAsPopulated } from './PickAsPopulated';
import type { QueryResponse } from './QueryResponse';

/**
 * Allows a QueryResponse type with specific populated properties
 */
export type QueryResponsePopulated<T extends Entity, K extends keyof T> = Extract<PickAsPopulated<T, K> & QueryResponse<Pick<T, Exclude<keyof T, K> | 'id'>>, T>;
