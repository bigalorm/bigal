import type { Entity } from '../Entity.js';
import type { OmitEntityCollections, OmitFunctions, PoolLike } from '../types/index.js';

import type { Sort } from './Sort.js';
import type { WhereQuery } from './WhereQuery.js';

export interface PopulateArgs<T extends Entity, K extends keyof T> {
  where?: WhereQuery<T>;
  select?: (K & string & keyof OmitFunctions<OmitEntityCollections<T>>)[];
  sort?: Sort<T>;
  skip?: number;
  limit?: number;
  pool?: PoolLike;
}
