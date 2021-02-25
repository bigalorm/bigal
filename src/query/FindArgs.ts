import type { Entity } from '../Entity';

import type { FindOneArgs } from './FindOneArgs';

export interface FindArgs<T extends Entity> extends FindOneArgs<T> {
  skip?: number;
  limit?: number;
}
