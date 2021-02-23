import type { FindOneArgs, FindOneArgsTyped } from './FindOneArgs';

export interface FindArgs extends FindOneArgs {
  skip?: number;
  limit?: number;
}

export interface FindArgsTyped<T> extends FindOneArgsTyped<T> {
  skip?: number;
  limit?: number;
}
