import type { OmitFunctions } from '../types/index.js';

import type { DoNotReturnRecords } from './DoNotReturnRecords.js';
import type { OnConflictOptions } from './OnConflictOptions.js';
import type { ReturnSelect } from './ReturnSelect.js';

type CreateOnConflictOptions<T extends Record<string, unknown>, K extends string & keyof OmitFunctions<T> = string & keyof OmitFunctions<T>> = OnConflictOptions<T, K> &
  Partial<DoNotReturnRecords | ReturnSelect<T>>;

type CreateOptionalOnConflictOptions<T extends Record<string, unknown>, K extends string & keyof OmitFunctions<T> = string & keyof OmitFunctions<T>> = Partial<OnConflictOptions<T, K>> &
  (DoNotReturnRecords | ReturnSelect<T>);

export type CreateOptions<T extends Record<string, unknown>, K extends string & keyof OmitFunctions<T> = string & keyof OmitFunctions<T>> =
  | CreateOnConflictOptions<T, K>
  | CreateOptionalOnConflictOptions<T, K>;
