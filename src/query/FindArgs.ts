import type { Entity } from '../Entity';

import type { FindOneArgs } from './FindOneArgs';

export interface FindArgs<T extends Entity, K extends keyof T = keyof T> extends FindOneArgs<T, K> {
  skip?: number;
  limit?: number;
}
