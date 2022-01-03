import type { Pool } from 'postgres-pool';

import type { Entity } from '../Entity';
import type { OmitEntityCollections, OmitFunctions } from '../types';

import type { Sort } from './Sort';
import type { WhereQuery } from './WhereQuery';

export interface FindOneArgs<T extends Entity, K extends keyof T = string & keyof OmitFunctions<OmitEntityCollections<T>> & keyof T> {
  select?: (K & string & keyof OmitFunctions<OmitEntityCollections<T>>)[];
  where?: WhereQuery<T>;
  sort?: Sort<T>;
  pool?: Pool;
}
