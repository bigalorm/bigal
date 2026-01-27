import type { Entity } from '../Entity.js';

export interface SelectAggregateExpression {
  _type: 'aggregate';
  fn: 'avg' | 'count' | 'max' | 'min' | 'sum';
  column?: string;
  distinct: boolean;
  alias: string;
}

export interface AggregateBuilder {
  distinct(): AggregateBuilder;
  as<TAlias extends string>(alias: TAlias): SelectAggregateExpression & { readonly alias: TAlias };
  readonly _expression: SelectAggregateExpression;
}

export class SelectBuilder<T extends Entity> {
  public count(column?: string & keyof T): AggregateBuilder {
    return this._createAggregateBuilder('count', column);
  }

  public sum(column: string & keyof T): AggregateBuilder {
    return this._createAggregateBuilder('sum', column);
  }

  public avg(column: string & keyof T): AggregateBuilder {
    return this._createAggregateBuilder('avg', column);
  }

  public max(column: string & keyof T): AggregateBuilder {
    return this._createAggregateBuilder('max', column);
  }

  public min(column: string & keyof T): AggregateBuilder {
    return this._createAggregateBuilder('min', column);
  }

  protected _createAggregateBuilder(fn: SelectAggregateExpression['fn'], column?: string): AggregateBuilder {
    let expression: SelectAggregateExpression = {
      _type: 'aggregate',
      fn,
      column,
      distinct: false,
      alias: fn,
    };

    const builder: AggregateBuilder = {
      get _expression() {
        return expression;
      },
      distinct() {
        expression = { ...expression, distinct: true };
        return builder;
      },
      as<TAlias extends string>(alias: TAlias) {
        return { ...expression, alias } as SelectAggregateExpression & { readonly alias: TAlias };
      },
    };

    return builder;
  }
}
