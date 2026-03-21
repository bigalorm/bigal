import type { FindOneArgs } from './FindOneArgs.js';

export interface FindArgs<T extends Record<string, unknown>, K extends keyof T = keyof T> extends FindOneArgs<T, K> {
  skip?: number;
  limit?: number;
}
