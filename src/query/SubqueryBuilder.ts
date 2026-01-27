import type { Entity } from '../Entity.js';
import type { IReadonlyRepository } from '../IReadonlyRepository.js';
import type { IRepository } from '../IRepository.js';

import { ScalarSubquery } from './ScalarSubquery.js';
import { SelectBuilder } from './SelectBuilder.js';
import type { AggregateBuilder, SelectAggregateExpression } from './SelectBuilder.js';

import type { Sort, SortObject, WhereQuery } from './index.js';

/**
 * An aggregate expression with a typed alias from `.as()`.
 */
export type TypedAggregateExpression<TAlias extends string> = SelectAggregateExpression & { readonly alias: TAlias };

/**
 * A callback that creates an aggregate with a typed alias.
 */
export type AggregateCallback<T extends Entity, TAlias extends string> = (builder: SelectBuilder<T>) => TypedAggregateExpression<TAlias>;

/**
 * Extracts the alias type from a select item.
 */
type ExtractItemAlias<T extends Entity, TItem> = TItem extends string & keyof T ? TItem : TItem extends AggregateCallback<T, infer A> ? A : TItem extends TypedAggregateExpression<infer A> ? A : never;

/**
 * Extracts all alias types from an array of select items using mapped type.
 */
type ExtractAllAliases<T extends Entity, TItems extends readonly unknown[]> = {
  [K in keyof TItems]: ExtractItemAlias<T, TItems[K]>;
}[number];

/**
 * Valid select items for type-safe column tracking.
 */
export type TypedSelectItem<T extends Entity> = AggregateCallback<T, string> | TypedAggregateExpression<string> | (string & keyof T);

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
 * Structural type that accepts any SubqueryBuilder<T, TColumns> regardless of T or TColumns.
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

/**
 * Structural type for typed subquery builders that tracks selected columns.
 * Used by join operations to enable type-safe sorting on subquery columns.
 */
export interface TypedSubqueryBuilder<TColumns extends string = never> extends SubqueryBuilderLike {
  readonly _columns?: TColumns;
}

export class SubqueryBuilder<T extends Entity, TColumns extends string = never> implements TypedSubqueryBuilder<TColumns> {
  public readonly _repository: IReadonlyRepository<T> | IRepository<T>;
  public _select?: string[];
  public _selectExpressions?: SelectAggregateExpression[];
  public _where?: WhereQuery<T>;
  public _sort?: SortObject<T> | string;
  public _limit?: number;
  public _groupBy?: (string & keyof T)[];
  public _having?: HavingCondition;

  // Phantom property to carry column type information
  public readonly _columns?: TColumns;

  public constructor(repository: IReadonlyRepository<T> | IRepository<T>) {
    this._repository = repository;
  }

  /**
   * Select columns and/or aggregate expressions for the subquery with type-safe column tracking.
   * @returns New SubqueryBuilder with the select applied and column types tracked
   * @example
   * // Type-safe select with callback aggregates
   * subquery(ProductRepository)
   *   .select(['store', (sb) => sb.count().as('productCount')])
   *   .groupBy(['store']);
   *
   * // Can then sort type-safely after joining:
   * StoreRepository.find()
   *   .join(productCounts, 'stats', { on: { id: 'store' } })
   *   .sort('stats.productCount desc')  // No type cast needed!
   */
  public select<const TItems extends readonly TypedSelectItem<T>[]>(columns: TItems): SubqueryBuilder<T, ExtractAllAliases<T, TItems>>;

  /**
   * Select columns and/or aggregate expressions for the subquery (untyped signature).
   * Note: Using aggregate callbacks that return `AggregateBuilder` instead of calling `.as()`
   * does not enable type-safe sorting.
   * @returns New SubqueryBuilder with the select applied
   */
  public select(columns: SelectItem<T>[]): SubqueryBuilder<T>;

  public select<const TItems extends readonly (SelectItem<T> | TypedSelectItem<T>)[]>(columns: TItems): SubqueryBuilder<T, ExtractAllAliases<T, TItems>> {
    const cloned = this.cloneBuilder<ExtractAllAliases<T, TItems>>();
    cloned._select = [];
    cloned._selectExpressions = [];

    const selectBuilder = new SelectBuilder<T>();

    for (const item of columns) {
      if (typeof item === 'string') {
        cloned._select.push(item);
      } else if (typeof item === 'function') {
        const fn = item as (builder: SelectBuilder<T>) => AggregateBuilder | SelectAggregateExpression;
        const result = fn(selectBuilder);
        const expr = '_expression' in result ? result._expression : result;
        cloned._selectExpressions.push(expr);
      } else {
        // TypedAggregateExpression or SelectAggregateExpression
        cloned._selectExpressions.push(item);
      }
    }

    return cloned;
  }

  /**
   * Group the subquery results by one or more columns.
   * @returns New SubqueryBuilder with the groupBy applied
   * @example
   * subquery(ProductRepository)
   *   .select(['storeId', (sb) => sb.count().as('productCount')])
   *   .groupBy(['storeId'])
   */
  public groupBy(columns: (string & keyof T)[]): SubqueryBuilder<T, TColumns> {
    const cloned = this.cloneBuilder<TColumns>();
    cloned._groupBy = columns;
    return cloned;
  }

  /**
   * Filter groups based on aggregate values (used with groupBy).
   * @returns New SubqueryBuilder with the having condition applied
   * @example
   * subquery(ProductRepository)
   *   .select(['storeId', (sb) => sb.count().as('productCount')])
   *   .groupBy(['storeId'])
   *   .having({ productCount: { '>': 5 } })
   */
  public having(condition: HavingCondition): SubqueryBuilder<T, TColumns> {
    const cloned = this.cloneBuilder<TColumns>();
    cloned._having = condition;
    return cloned;
  }

  public where(query: WhereQuery<T>): SubqueryBuilder<T, TColumns> {
    const cloned = this.cloneBuilder<TColumns>();
    cloned._where = query;
    return cloned;
  }

  public sort(value: Sort<T>): SubqueryBuilder<T, TColumns> {
    const cloned = this.cloneBuilder<TColumns>();
    cloned._sort = value as SortObject<T> | string;
    return cloned;
  }

  public limit(maxRows: number): SubqueryBuilder<T, TColumns> {
    const cloned = this.cloneBuilder<TColumns>();
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

  private cloneBuilder<TNewColumns extends string>(): SubqueryBuilder<T, TNewColumns> {
    const cloned = new SubqueryBuilder<T, TNewColumns>(this._repository);
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
