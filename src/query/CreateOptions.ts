import { type Entity } from '../Entity.js';
import { type OmitEntityCollections, type OmitFunctions } from '../types/index.js';

import { type CommentOptions } from './CommentOptions.js';
import { type DoNotReturnRecords } from './DoNotReturnRecords.js';
import { type ExecutionOptions } from './ExecutionOptions.js';
import { type OnConflictOptions } from './OnConflictOptions.js';
import { type ReturnSelect } from './ReturnSelect.js';

type CreateOnConflictOptions<T extends Entity, K extends string & keyof OmitFunctions<OmitEntityCollections<T>> = string & keyof OmitFunctions<OmitEntityCollections<T>>> = CommentOptions &
  ExecutionOptions &
  OnConflictOptions<T, K> &
  Partial<DoNotReturnRecords | ReturnSelect<T>>;

type CreateOptionalOnConflictOptions<T extends Entity, K extends string & keyof OmitFunctions<OmitEntityCollections<T>> = string & keyof OmitFunctions<OmitEntityCollections<T>>> = Partial<
  OnConflictOptions<T, K>
> &
  CommentOptions &
  ExecutionOptions &
  (DoNotReturnRecords | Partial<ReturnSelect<T>>);

export type CreateOptions<T extends Entity, K extends string & keyof OmitFunctions<OmitEntityCollections<T>> = string & keyof OmitFunctions<OmitEntityCollections<T>>> =
  | CreateOnConflictOptions<T, K>
  | CreateOptionalOnConflictOptions<T, K>;
