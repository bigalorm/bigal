import type { Entity } from '../Entity';
import type { OmitEntityCollections, OmitFunctions } from '../types';

import type { WhereQuery } from './WhereQuery';

export interface OnConflictIgnoreOptions<T extends Entity, K extends string & keyof OmitFunctions<OmitEntityCollections<T>> = string & keyof OmitFunctions<OmitEntityCollections<T>>> {
  onConflict: {
    action: 'ignore';
    targets: K[];
    where?: WhereQuery<T>;
  };
}

export interface OnConflictMergeOptions<T extends Entity, K extends string & keyof OmitFunctions<OmitEntityCollections<T>> = string & keyof OmitFunctions<OmitEntityCollections<T>>> {
  onConflict: {
    action: 'merge';
    targets: K[];
    merge?: K[];
    where?: WhereQuery<T>;
  };
}

export type OnConflictOptions<T extends Entity, K extends string & keyof OmitFunctions<OmitEntityCollections<T>> = string & keyof OmitFunctions<OmitEntityCollections<T>>> =
  | OnConflictIgnoreOptions<T, K>
  | OnConflictMergeOptions<T, K>;
