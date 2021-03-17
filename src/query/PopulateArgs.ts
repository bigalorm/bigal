import type { Entity } from '../Entity';
import type { GetValueType, PickByValueType, OmitFunctionsAndEntityCollections } from '../types';

import type { Sort } from './Sort';
import type { WhereQuery } from './WhereQuery';

export interface PopulateArgs<T extends Entity> {
  where?: WhereQuery<T>;
  select?: (string & keyof OmitFunctionsAndEntityCollections<T>)[];
  sort?: Sort<T>;
  skip?: number;
  limit?: number;
}

export interface PopulatedProperty<T extends Entity, TProperty extends string & keyof PickByValueType<T, Entity>> extends PopulateArgs<GetValueType<PickByValueType<T, Entity>[TProperty], Entity>> {
  propertyName: TProperty;
}
