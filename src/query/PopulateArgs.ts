import type { Pool } from 'postgres-pool';

import type { Entity } from '../Entity';
import type { OmitEntityCollections, OmitFunctions } from '../types';

import type { Sort } from './Sort';
import type { WhereQuery } from './WhereQuery';

export interface PopulateArgs<T extends Entity, K extends keyof T> {
  where?: WhereQuery<T>;
  select?: (K & string & keyof OmitFunctions<OmitEntityCollections<T>>)[];
  sort?: Sort<T>;
  skip?: number;
  limit?: number;
  pool?: Pool;
}
