import type { OmitEntityCollections, OmitFunctions, PoolLike } from '../types/index.js';

import type { Sort } from './Sort.js';
import type { WhereQuery } from './WhereQuery.js';

export interface FindOneArgs<T extends Record<string, unknown>, K extends keyof T = string & keyof OmitFunctions<OmitEntityCollections<T>> & keyof T> {
  select?: (K & string & keyof OmitFunctions<OmitEntityCollections<T>>)[];
  where?: WhereQuery<T>;
  sort?: Sort<T>;
  pool?: PoolLike;
  /** Control global filters. false = disable all, { filterName: false } = disable specific filter */
  filters?: Record<string, false> | false;
}
