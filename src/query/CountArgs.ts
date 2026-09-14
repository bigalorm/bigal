import { type Entity } from '../Entity.js';

import { type ExecutionOptions } from './ExecutionOptions.js';
import { type WhereQuery } from './WhereQuery.js';

export interface CountArgs<T extends Entity> extends ExecutionOptions {
  where?: WhereQuery<T>;
}
