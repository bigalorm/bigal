import { type Entity } from '../Entity.js';
import { type OmitEntityCollections, type OmitFunctions } from '../types/index.js';

import { type ExecutionOptions } from './ExecutionOptions.js';
import { type LockOptions } from './LockOptions.js';
import { type Sort } from './Sort.js';
import { type WhereQuery } from './WhereQuery.js';

export interface FindOneArgs<T extends Entity, K extends keyof T = string & keyof OmitFunctions<OmitEntityCollections<T>> & keyof T> extends ExecutionOptions {
  select?: (K & string & keyof OmitFunctions<OmitEntityCollections<T>>)[];
  where?: WhereQuery<T>;
  sort?: Sort<T>;
  lock?: LockOptions;
}
