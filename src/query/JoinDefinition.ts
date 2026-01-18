import type { Entity } from '../Entity.js';
import type { ModelMetadata } from '../metadata/index.js';

import type { SubqueryBuilderLike } from './SubqueryBuilder.js';
import type { WhereQuery } from './WhereQuery.js';

export type JoinType = 'inner' | 'left';

export interface ModelJoinDefinition<T extends Entity = Entity> {
  propertyName: string;
  alias: string;
  type: JoinType;
  on?: WhereQuery<T>;
  relatedModel?: ModelMetadata<T>;
  foreignKeyColumn?: string;
  relatedPrimaryKey?: string;
}

/**
 * ON condition for subquery joins - maps main table column to subquery column
 * @example { id: 'storeId' } means main.id = subquery.storeId
 */
export type SubqueryJoinOnCondition = Record<string, string>;

export interface SubqueryJoinDefinition {
  subquery: SubqueryBuilderLike;
  alias: string;
  type: JoinType;
  on: SubqueryJoinOnCondition;
}

export type JoinDefinition<T extends Entity = Entity> = ModelJoinDefinition<T> | SubqueryJoinDefinition;

export function isSubqueryJoin(join: JoinDefinition): join is SubqueryJoinDefinition {
  return 'subquery' in join;
}
