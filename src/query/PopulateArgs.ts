import type { Entity } from '../Entity.js';
import type { OmitEntityCollections, OmitFunctions, PoolLike } from '../types/index.js';

import type { Sort, SortObject } from './Sort.js';
import type { WhereQuery } from './WhereQuery.js';

/**
 * Options for filtering and sorting by junction table columns in through relationships.
 * Uses looser typing since the junction table entity type is determined at runtime.
 */
export interface ThroughArgs {
  /** Filter applied to the junction table query */
  where?: Record<string, unknown>;
  /** Sort applied to the junction table query - determines final ordering of populated items */
  sort?: SortObject<Entity> | string;
}

export interface PopulateArgs<T extends Entity, K extends keyof T> {
  where?: WhereQuery<T>;
  select?: (K & string & keyof OmitFunctions<OmitEntityCollections<T>>)[];
  sort?: Sort<T>;
  skip?: number;
  limit?: number;
  pool?: PoolLike;
  /**
   * Options for filtering/sorting by junction table columns.
   * Only applicable to many-to-many relationships that use `through`.
   */
  through?: ThroughArgs;
}
