import type { Sort } from './Sort';
import type { WhereQuery } from './WhereQuery';

export interface FindOneArgs<T> {
  select?: (string & keyof T)[];
  where?: WhereQuery<T>;
  sort?: Sort<T>;
}
