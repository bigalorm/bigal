import type { PoolLike } from '../types/index.js';

import type { WhereQuery } from './WhereQuery.js';

export interface CountArgs<T extends Record<string, unknown>> {
  where?: WhereQuery<T>;
  pool?: PoolLike;
}
