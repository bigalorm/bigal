import type { WhereQuery, WhereQueryTyped } from './WhereQuery';

export interface PopulateArgs {
  where?: WhereQuery;
  select?: string[];
  sort?: string[] | string;
  skip?: number;
  limit?: number;
}

export interface PopulateArgsTyped<T> extends PopulateArgs {
  where?: WhereQueryTyped<T>;
  select?: (string & keyof T)[];
}
