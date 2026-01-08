import type { Entity } from '../Entity.js';
import type { IReadonlyRepository } from '../IReadonlyRepository.js';
import type { IRepository } from '../IRepository.js';

import { SubqueryBuilder } from './SubqueryBuilder.js';

export { ScalarSubquery } from './ScalarSubquery.js';
export { SubqueryBuilder } from './SubqueryBuilder.js';
export type { SubqueryBuilderLike } from './SubqueryBuilder.js';

export function subquery<T extends Entity>(repository: IReadonlyRepository<T> | IRepository<T>): SubqueryBuilder<T> {
  return new SubqueryBuilder<T>(repository);
}
