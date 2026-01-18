import type { Entity } from '../Entity.js';
import type { IReadonlyRepository } from '../IReadonlyRepository.js';
import type { IRepository } from '../IRepository.js';

import { ScalarSubquery } from './ScalarSubquery.js';
import { SelectBuilder } from './SelectBuilder.js';
import type { AggregateBuilder, SelectAggregateExpression } from './SelectBuilder.js';

import type { Sort, SortObject, WhereQuery } from './index.js';

export type SelectItem<T extends Entity> = ((builder: SelectBuilder<T>) => AggregateBuilder | SelectAggregateExpression) | (string & keyof T);

export interface HavingComparer {
  '<'?: number;
  '<='?: number;
  '>'?: number;
  '>='?: number;
  '!='?: number;
}

export type HavingCondition = Record<string, HavingComparer | number>;

/**
 * Structural type that accepts any SubqueryBuilder<T> regardless of T.
 * Uses `unknown` for generic-dependent properties to allow variance.
 * Only includes data properties, not methods, to avoid method return type variance issues.
 */
export interface SubqueryBuilderLike {
  _repository: unknown;
  _select?: string[];
  _selectExpressions?: SelectAggregateExpression[];
  _where?: unknown;
  _sort?: unknown;
  _limit?: number;
  _groupBy?: string[];
  _having?: HavingCondition;
}

export class SubqueryBuilder<T extends Entity> {
  public readonly _repository: IReadonlyRepository<T> | IRepository<T>;
  public _select?: string[];
  public _selectExpressions?: SelectAggregateExpression[];
  public _where?: WhereQuery<T>;
  public _sort?: SortObject<T> | string;
  public _limit?: number;
  public _groupBy?: (string & keyof T)[];
  public _having?: HavingCondition;

  public constructor(repository: IReadonlyRepository<T> | IRepository<T>) {
    this._repository = repository;
  }

  /**
   * Select columns and/or aggregate expressions for the subquery.
   * @returns New SubqueryBuilder with the select applied
   * @example
   * // Select columns only
   * subquery(ProductRepository).select(['id', 'name'])
   *
   * // Select with aggregates
   * subquery(ProductRepository).select(['storeId', s => s.count().as('productCount')])
   */
  public select(columns: SelectItem<T>[]): SubqueryBuilder<T> {
    const cloned = this.cloneBuilder();
    cloned._select = [];
    cloned._selectExpressions = [];

    const selectBuilder = new SelectBuilder<T>();

    for (const item of columns) {
      if (typeof item === 'string') {
        cloned._select.push(item);
      } else {
        const result = item(selectBuilder);
        const expr = '_expression' in result ? result._expression : result;
        cloned._selectExpressions.push(expr);
      }
    }

    return cloned;
  }

  /**
   * Group the subquery results by one or more columns.
   * @returns New SubqueryBuilder with the groupBy applied
   * @example
   * subquery(ProductRepository)
   *   .select(['storeId', s => s.count().as('productCount')])
   *   .groupBy(['storeId'])
   */
  public groupBy(columns: (string & keyof T)[]): SubqueryBuilder<T> {
    const cloned = this.cloneBuilder();
    cloned._groupBy = columns;
    return cloned;
  }

  /**
   * Filter groups based on aggregate values (used with groupBy).
   * @returns New SubqueryBuilder with the having condition applied
   * @example
   * subquery(ProductRepository)
   *   .select(['storeId', s => s.count().as('productCount')])
   *   .groupBy(['storeId'])
   *   .having({ productCount: { '>': 5 } })
   */
  public having(condition: HavingCondition): SubqueryBuilder<T> {
    const cloned = this.cloneBuilder();
    cloned._having = condition;
    return cloned;
  }

  public where(query: WhereQuery<T>): SubqueryBuilder<T> {
    const cloned = this.cloneBuilder();
    cloned._where = query;
    return cloned;
  }

  public sort(value: Sort<T>): SubqueryBuilder<T> {
    const cloned = this.cloneBuilder();
    cloned._sort = value as SortObject<T> | string;
    return cloned;
  }

  public limit(maxRows: number): SubqueryBuilder<T> {
    const cloned = this.cloneBuilder();
    cloned._limit = maxRows;
    return cloned;
  }

  public count(): ScalarSubquery<number> {
    return new ScalarSubquery<number>(this as unknown as SubqueryBuilder<Entity>, 'count');
  }

  public sum(column: string & keyof T): ScalarSubquery<number> {
    return new ScalarSubquery<number>(this as unknown as SubqueryBuilder<Entity>, 'sum', column);
  }

  public avg(column: string & keyof T): ScalarSubquery<number> {
    return new ScalarSubquery<number>(this as unknown as SubqueryBuilder<Entity>, 'avg', column);
  }

  public max<K extends string & keyof T>(column: K): ScalarSubquery<T[K]> {
    return new ScalarSubquery<T[K]>(this as unknown as SubqueryBuilder<Entity>, 'max', column);
  }

  public min<K extends string & keyof T>(column: K): ScalarSubquery<T[K]> {
    return new ScalarSubquery<T[K]>(this as unknown as SubqueryBuilder<Entity>, 'min', column);
  }

  private cloneBuilder(): SubqueryBuilder<T> {
    const cloned = new SubqueryBuilder<T>(this._repository);
    cloned._select = this._select;
    cloned._selectExpressions = this._selectExpressions;
    cloned._where = this._where;
    cloned._sort = this._sort;
    cloned._limit = this._limit;
    cloned._groupBy = this._groupBy;
    cloned._having = this._having;
    return cloned;
  }
}
