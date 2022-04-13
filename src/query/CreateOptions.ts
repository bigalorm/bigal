import type { Entity } from '../Entity';
import type { OmitEntityCollections, OmitFunctions } from '../types';

import type { DoNotReturnRecords } from './DoNotReturnRecords';
import type { OnConflictOptions } from './OnConflictOptions';
import type { ReturnSelect } from './ReturnSelect';

type CreateOnConflictOptions<T extends Entity, K extends string & keyof OmitFunctions<OmitEntityCollections<T>> = string & keyof OmitFunctions<OmitEntityCollections<T>>> = OnConflictOptions<T, K> &
  Partial<DoNotReturnRecords | ReturnSelect<T>>;

type CreateOptionalOnConflictOptions<T extends Entity, K extends string & keyof OmitFunctions<OmitEntityCollections<T>> = string & keyof OmitFunctions<OmitEntityCollections<T>>> = Partial<
  OnConflictOptions<T, K>
> &
  (DoNotReturnRecords | ReturnSelect<T>);

export type CreateOptions<T extends Entity, K extends string & keyof OmitFunctions<OmitEntityCollections<T>> = string & keyof OmitFunctions<OmitEntityCollections<T>>> =
  | CreateOnConflictOptions<T, K>
  | CreateOptionalOnConflictOptions<T, K>;
