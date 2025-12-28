import type { Entity } from '../Entity.js';
import type { PoolLike } from '../types/index.js';

import type { WhereQuery } from './WhereQuery.js';

export interface CountArgs<T extends Entity> {
  where?: WhereQuery<T>;
  pool?: PoolLike;
}
