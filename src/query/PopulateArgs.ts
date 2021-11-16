import type { Pool } from 'postgres-pool';

import type { Entity } from '../Entity';
import type { OmitFunctionsAndEntityCollections } from '../types';

import type { Sort } from './Sort';
import type { WhereQuery } from './WhereQuery';

export interface PopulateArgs<T extends Entity> {
  where?: WhereQuery<T>;
  select?: (string & keyof OmitFunctionsAndEntityCollections<T>)[];
  sort?: Sort<T>;
  skip?: number;
  limit?: number;
  pool?: Pool;
}
