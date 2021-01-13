import type { WhereQuery, WhereQueryTyped } from './WhereQuery';

export interface FindOneArgs {
  select?: string[];
  where?: WhereQuery;
  sort?: string[] | string;
}

export interface FindOneArgsTyped<T> extends FindOneArgs {
  select?: (string & keyof T)[];
  where?: WhereQueryTyped<T>;
}
