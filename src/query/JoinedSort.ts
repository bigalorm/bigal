import type { Entity } from '../Entity.js';
import type { OmitEntityCollections, OmitFunctions } from '../types/index.js';

import type { JoinInfo } from './JoinedWhereQuery.js';
import type { Sort } from './Sort.js';

type JoinAliases<TJoins extends JoinInfo> = TJoins['alias'];

type GetJoinedEntity<TJoins extends JoinInfo, TAlias extends string> = Extract<TJoins, { alias: TAlias }>['entity'];

type JoinedColumnPath<TJoins extends JoinInfo, TAlias extends JoinAliases<TJoins> = JoinAliases<TJoins>> = TAlias extends string
  ? `${TAlias}.${string & keyof OmitFunctions<OmitEntityCollections<GetJoinedEntity<TJoins, TAlias>>>}`
  : never;

type JoinedSortString<TJoins extends JoinInfo> =
  | JoinedColumnPath<TJoins>
  | `${JoinedColumnPath<TJoins>} ASC`
  | `${JoinedColumnPath<TJoins>} asc`
  | `${JoinedColumnPath<TJoins>} DESC`
  | `${JoinedColumnPath<TJoins>} desc`;

export type JoinedSort<T extends Entity, TJoins extends JoinInfo = never> = [TJoins] extends [never] ? Sort<T> : JoinedSortString<TJoins> | Sort<T>;
