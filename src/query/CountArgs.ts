import type { Pool } from 'postgres-pool';

import type { Entity } from '../Entity.js';

import type { WhereQuery } from './WhereQuery.js';

export interface CountArgs<T extends Entity> {
  where?: WhereQuery<T>;
  pool?: Pool;
}
