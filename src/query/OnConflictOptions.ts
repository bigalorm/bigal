import type { OmitFunctions } from '../types/index.js';

import type { WhereQuery } from './WhereQuery.js';

type OnConflictTargets<T extends Record<string, unknown>, K extends string & keyof OmitFunctions<T> = string & keyof OmitFunctions<T>> =
  | K[]
  | {
      columns: K[];
      where: WhereQuery<T>;
    };

export interface OnConflictIgnoreOptions<T extends Record<string, unknown>, K extends string & keyof OmitFunctions<T> = string & keyof OmitFunctions<T>> {
  onConflict: {
    action: 'ignore';
    targets: OnConflictTargets<T, K>;
  };
}

export interface OnConflictMergeOptions<T extends Record<string, unknown>, K extends string & keyof OmitFunctions<T> = string & keyof OmitFunctions<T>> {
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

export type OnConflictOptions<T extends Record<string, unknown>, K extends string & keyof OmitFunctions<T> = string & keyof OmitFunctions<T>> =
  | OnConflictIgnoreOptions<T, K>
  | OnConflictMergeOptions<T, K>;
