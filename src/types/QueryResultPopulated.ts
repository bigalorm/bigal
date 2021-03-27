import type { Entity } from '../Entity';

import type { PickAsPopulated } from './PickAsPopulated';
import type { QueryResult } from './QueryResult';

/**
 * Allows a QueryResult type with specific populated properties
 */
export type QueryResultPopulated<T extends Entity, K extends keyof T> = Omit<QueryResult<T>, K> & PickAsPopulated<T, K>;
