import type { GetPropertyType } from '../types/GetPropertyType';

import type { Sort } from './Sort';
import type { WhereQuery } from './WhereQuery';

export interface PopulateArgs<T> {
  where?: WhereQuery<T>;
  select?: (string & keyof T)[];
  sort?: Sort<T>;
  skip?: number;
  limit?: number;
}

export interface PopulatedProperty<T, TProperty extends string & keyof T> extends PopulateArgs<GetPropertyType<T, TProperty>> {
  propertyName: TProperty;
}
