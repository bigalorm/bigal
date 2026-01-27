import type { Entity } from '../Entity.js';
import type { OmitEntityCollections, OmitFunctions } from '../types/index.js';

import type { AnyJoinInfo, JoinInfo, SubqueryJoinInfo } from './JoinedWhereQuery.js';
import type { Sort } from './Sort.js';

// Re-export for convenience
export type { AnyJoinInfo } from './JoinedWhereQuery.js';

/**
 * Extracts all aliases from a union of join info types.
 */
type AnyJoinAliases<TJoins extends AnyJoinInfo> = TJoins['alias'];

/**
 * Gets available columns for any join type (model or subquery).
 */
type GetJoinColumns<TJoins extends AnyJoinInfo, TAlias extends string> =
  Extract<TJoins, { alias: TAlias }> extends SubqueryJoinInfo<TAlias, infer TColumns>
    ? TColumns
    : Extract<TJoins, { alias: TAlias }> extends JoinInfo<string, TAlias, infer TEntity>
      ? string & keyof OmitFunctions<OmitEntityCollections<TEntity>>
      : never;

/**
 * Creates column path strings for any join type.
 * For model joins: uses entity property names
 * For subquery joins: uses tracked column names
 */
type AnyJoinedColumnPath<TJoins extends AnyJoinInfo, TAlias extends AnyJoinAliases<TJoins> = AnyJoinAliases<TJoins>> = TAlias extends string ? `${TAlias}.${GetJoinColumns<TJoins, TAlias>}` : never;

/**
 * Sort strings for joined columns (model or subquery joins).
 */
type JoinedSortString<TJoins extends AnyJoinInfo> =
  | AnyJoinedColumnPath<TJoins>
  | `${AnyJoinedColumnPath<TJoins>} ASC`
  | `${AnyJoinedColumnPath<TJoins>} asc`
  | `${AnyJoinedColumnPath<TJoins>} DESC`
  | `${AnyJoinedColumnPath<TJoins>} desc`;

/**
 * Sort type that supports both base entity columns and joined columns (from model or subquery joins).
 */
export type JoinedSort<T extends Entity, TJoins extends AnyJoinInfo = never> = [TJoins] extends [never] ? Sort<T> : JoinedSortString<TJoins> | Sort<T>;
