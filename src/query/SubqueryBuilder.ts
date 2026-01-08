import type { Entity } from '../Entity.js';
import type { IReadonlyRepository } from '../IReadonlyRepository.js';
import type { IRepository } from '../IRepository.js';

import { ScalarSubquery } from './ScalarSubquery.js';

import type { Sort, SortObject, WhereQuery } from './index.js';

/**
 * Structural type that accepts any SubqueryBuilder<T> regardless of T.
 * Uses `unknown` for generic-dependent properties to allow variance.
 * Only includes data properties, not methods, to avoid method return type variance issues.
 */
export interface SubqueryBuilderLike {
  _repository: unknown;
  _select?: string[];
  _where?: unknown;
  _sort?: unknown;
  _limit?: number;
}

export class SubqueryBuilder<T extends Entity> {
  public readonly _repository: IReadonlyRepository<T> | IRepository<T>;
  public _select?: string[];
  public _where?: WhereQuery<T>;
  public _sort?: SortObject<T> | string;
  public _limit?: number;

  public constructor(repository: IReadonlyRepository<T> | IRepository<T>) {
    this._repository = repository;
  }

  public select(columns: (string & keyof T)[]): SubqueryBuilder<T> {
    const cloned = this.cloneBuilder();
    cloned._select = columns;
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
    cloned._where = this._where;
    cloned._sort = this._sort;
    cloned._limit = this._limit;
    return cloned;
  }
}
