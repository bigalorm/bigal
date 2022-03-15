import type { Pool } from 'postgres-pool';

import type { Entity } from '../Entity';

import type { WhereQuery } from './WhereQuery';

export interface CountArgs<T extends Entity> {
  where?: WhereQuery<T>;
  pool?: Pool;
}
