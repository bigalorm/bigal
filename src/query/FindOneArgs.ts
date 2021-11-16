import type { Pool } from 'postgres-pool';

import type { Entity } from '../Entity';
import type { OmitFunctionsAndEntityCollections } from '../types';

import type { Sort } from './Sort';
import type { WhereQuery } from './WhereQuery';

export interface FindOneArgs<T extends Entity> {
  select?: (string & keyof OmitFunctionsAndEntityCollections<T>)[];
  where?: WhereQuery<T>;
  sort?: Sort<T>;
  pool?: Pool;
}
