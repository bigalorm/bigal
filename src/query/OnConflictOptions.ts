import type { Entity } from '../Entity';
import type { OmitEntityCollections, OmitFunctions } from '../types';

import type { WhereQuery } from './WhereQuery';

export interface OnConflictIgnoreOptions<T extends Entity, K extends string & keyof OmitFunctions<OmitEntityCollections<T>> = string & keyof OmitFunctions<OmitEntityCollections<T>>> {
  onConflict: {
    action: 'ignore';
    targets: K[];
  };
}

export interface OnConflictMergeOptions<T extends Entity, K extends string & keyof OmitFunctions<OmitEntityCollections<T>> = string & keyof OmitFunctions<OmitEntityCollections<T>>> {
  onConflict: {
    action: 'merge';
    targets: K[] | { columns: K[]; where: WhereQuery<T> };
    merge?: K[];
    where?: WhereQuery<T>;
  };
}

export type OnConflictOptions<T extends Entity, K extends string & keyof OmitFunctions<OmitEntityCollections<T>> = string & keyof OmitFunctions<OmitEntityCollections<T>>> =
  | OnConflictIgnoreOptions<T, K>
  | OnConflictMergeOptions<T, K>;
