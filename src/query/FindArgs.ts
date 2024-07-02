import type { Entity } from '../Entity.js';

import type { FindOneArgs } from './FindOneArgs.js';

export interface FindArgs<T extends Entity, K extends keyof T = keyof T> extends FindOneArgs<T, K> {
  skip?: number;
  limit?: number;
}
