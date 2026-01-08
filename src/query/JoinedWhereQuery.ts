import type { Entity } from '../Entity.js';

import type { WhereQuery, WhereQueryStatement } from './WhereQuery.js';

type ExcludeUndefined<T> = Exclude<T, undefined>;

export interface JoinInfo<TProperty extends string = string, TAlias extends string = string, TEntity extends Entity = Entity> {
  property: TProperty;
  alias: TAlias;
  entity: TEntity;
}

type JoinAliases<TJoins extends JoinInfo> = TJoins['alias'];

type GetJoinedEntity<TJoins extends JoinInfo, TAlias extends string> = Extract<TJoins, { alias: TAlias }>['entity'];

type JoinedPropertyConstraint<TJoinedEntity extends Entity, TPropertyValue> = WhereQuery<TJoinedEntity> | WhereQueryStatement<ExcludeUndefined<TPropertyValue>>;

/**
 * WhereQuery that supports nested where clauses for joined relationships.
 * @example
 * .join('store', 'primaryStore')
 * .where({ primaryStore: { name: 'Acme' } })
 *
 * .join('store')
 * .where({ store: { name: 'Acme' } })
 */
export type JoinedWhereQuery<T extends Entity, TJoins extends JoinInfo = never> = WhereQuery<T> &
  ([TJoins] extends [never]
    ? // eslint-disable-next-line @typescript-eslint/no-empty-object-type
      {}
    : {
        [K in JoinAliases<TJoins>]?: JoinedPropertyConstraint<GetJoinedEntity<TJoins, K>, GetJoinedEntity<TJoins, K>>;
      }) & {
    and?: JoinedWhereQuery<T, TJoins>[];
    or?: JoinedWhereQuery<T, TJoins>[];
  };
