import type { Entity } from '../Entity.js';

import type { WhereQuery, WhereQueryStatement } from './WhereQuery.js';

type ExcludeUndefined<T> = Exclude<T, undefined>;

export interface JoinInfo<TProperty extends string = string, TAlias extends string = string, TEntity extends Entity = Entity> {
  property: TProperty;
  alias: TAlias;
  entity: TEntity;
}

/**
 * Join info for subquery joins - tracks alias and available column names.
 * Distinguished from JoinInfo by the _brand discriminator.
 */
export interface SubqueryJoinInfo<TAlias extends string = string, TColumns extends string = string> {
  alias: TAlias;
  columns: TColumns;
  _brand: 'subquery';
}

/**
 * Union type for any join info (model or subquery).
 */
export type AnyJoinInfo = JoinInfo | SubqueryJoinInfo;

/**
 * Extracts aliases from model JoinInfo only.
 */
type ModelJoinAliases<TJoins extends AnyJoinInfo> = Extract<TJoins, JoinInfo>['alias'];

type GetJoinedEntity<TJoins extends JoinInfo, TAlias extends string> = Extract<TJoins, { alias: TAlias }>['entity'];

type JoinedPropertyConstraint<TJoinedEntity extends Entity, TPropertyValue> = WhereQuery<TJoinedEntity> | WhereQueryStatement<ExcludeUndefined<TPropertyValue>>;

/**
 * WhereQuery that supports nested where clauses for joined relationships.
 * Note: Subquery joins do not support where clause filtering by alias.
 * @example
 * .join('store', 'primaryStore')
 * .where({ primaryStore: { name: 'Acme' } })
 *
 * .join('store')
 * .where({ store: { name: 'Acme' } })
 */
export type JoinedWhereQuery<T extends Entity, TJoins extends AnyJoinInfo = never> = WhereQuery<T> &
  ([TJoins] extends [never]
    ? // eslint-disable-next-line @typescript-eslint/no-empty-object-type
      {}
    : [Extract<TJoins, JoinInfo>] extends [never]
      ? // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        {}
      : {
          [K in ModelJoinAliases<TJoins>]?: JoinedPropertyConstraint<GetJoinedEntity<Extract<TJoins, JoinInfo>, K>, GetJoinedEntity<Extract<TJoins, JoinInfo>, K>>;
        }) & {
    and?: JoinedWhereQuery<T, TJoins>[];
    or?: JoinedWhereQuery<T, TJoins>[];
  };
