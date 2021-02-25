import type { Entity } from '../Entity';

import type { Sort } from './Sort';
import type { WhereQuery } from './WhereQuery';

export interface FindOneArgs<T extends Entity> {
  select?: (string & keyof T)[];
  where?: WhereQuery<T>;
  sort?: Sort<T>;
}
