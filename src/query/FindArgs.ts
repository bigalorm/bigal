import type { FindOneArgs } from './FindOneArgs';

export interface FindArgs<T> extends FindOneArgs<T> {
  skip?: number;
  limit?: number;
}
