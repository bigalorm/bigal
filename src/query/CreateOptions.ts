import type { Entity } from '../Entity.js';
import type { OmitEntityCollections, OmitFunctions } from '../types/index.js';

import type { DoNotReturnRecords } from './DoNotReturnRecords.js';
import type { OnConflictOptions } from './OnConflictOptions.js';
import type { ReturnSelect } from './ReturnSelect.js';

type CreateOnConflictOptions<T extends Entity, K extends string & keyof OmitFunctions<OmitEntityCollections<T>> = string & keyof OmitFunctions<OmitEntityCollections<T>>> = OnConflictOptions<T, K> &
  Partial<DoNotReturnRecords | ReturnSelect<T>>;

type CreateOptionalOnConflictOptions<T extends Entity, K extends string & keyof OmitFunctions<OmitEntityCollections<T>> = string & keyof OmitFunctions<OmitEntityCollections<T>>> = Partial<
  OnConflictOptions<T, K>
> &
  (DoNotReturnRecords | ReturnSelect<T>);

export type CreateOptions<T extends Entity, K extends string & keyof OmitFunctions<OmitEntityCollections<T>> = string & keyof OmitFunctions<OmitEntityCollections<T>>> =
  | CreateOnConflictOptions<T, K>
  | CreateOptionalOnConflictOptions<T, K>;
