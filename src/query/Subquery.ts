import type { Entity } from '../Entity.js';
import type { IReadonlyRepository } from '../IReadonlyRepository.js';
import type { IRepository } from '../IRepository.js';

import { SubqueryBuilder } from './SubqueryBuilder.js';

export { ScalarSubquery } from './ScalarSubquery.js';
export { SelectBuilder } from './SelectBuilder.js';
export type { AggregateBuilder, SelectAggregateExpression } from './SelectBuilder.js';
export { SubqueryBuilder } from './SubqueryBuilder.js';
export type { HavingComparer, HavingCondition, SelectItem, SubqueryBuilderLike } from './SubqueryBuilder.js';

export function subquery<T extends Entity>(repository: IReadonlyRepository<T> | IRepository<T>): SubqueryBuilder<T> {
  return new SubqueryBuilder<T>(repository);
}
