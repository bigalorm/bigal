import type { Entity } from '../Entity.js';

import type { SubqueryBuilder } from './SubqueryBuilder.js';

export class ScalarSubquery<TValue> {
  declare private readonly _resultType: TValue;
  public readonly _aggregate: 'avg' | 'count' | 'max' | 'min' | 'sum';
  public readonly _aggregateColumn?: string;
  public readonly _subquery: SubqueryBuilder<Entity>;

  public constructor(parentSubquery: SubqueryBuilder<Entity>, aggregate: 'avg' | 'count' | 'max' | 'min' | 'sum', column?: string) {
    this._subquery = parentSubquery;
    this._aggregate = aggregate;
    this._aggregateColumn = column;
  }
}
