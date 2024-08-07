import type { Entity } from '../Entity.js';
import type { OmitEntityCollections, OmitFunctions } from '../types/index.js';

import type { WhereQuery } from './WhereQuery.js';

type OnConflictTargets<T extends Entity, K extends string & keyof OmitFunctions<OmitEntityCollections<T>> = string & keyof OmitFunctions<OmitEntityCollections<T>>> =
  | K[]
  | {
      columns: K[];
      where: WhereQuery<T>;
    };

export interface OnConflictIgnoreOptions<T extends Entity, K extends string & keyof OmitFunctions<OmitEntityCollections<T>> = string & keyof OmitFunctions<OmitEntityCollections<T>>> {
  onConflict: {
    action: 'ignore';
    targets: OnConflictTargets<T, K>;
  };
}

export interface OnConflictMergeOptions<T extends Entity, K extends string & keyof OmitFunctions<OmitEntityCollections<T>> = string & keyof OmitFunctions<OmitEntityCollections<T>>> {
  onConflict: {
    action: 'merge';
    targets: OnConflictTargets<T, K>;
    merge?:
      | K[]
      | {
          columns?: K[];
          where: WhereQuery<T>;
        };
  };
}

export type OnConflictOptions<T extends Entity, K extends string & keyof OmitFunctions<OmitEntityCollections<T>> = string & keyof OmitFunctions<OmitEntityCollections<T>>> =
  | OnConflictIgnoreOptions<T, K>
  | OnConflictMergeOptions<T, K>;
