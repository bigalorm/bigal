import type { Entity } from '../Entity';
import type { OmitEntityCollections, OmitFunctions } from '../types';

import type { DoNotReturnRecords } from './DoNotReturnRecords';
import type { OnConflictOptions } from './OnConflictOptions';
import type { ReturnSelect } from './ReturnSelect';

export type CreateOptions<T extends Entity, K extends string & keyof OmitFunctions<OmitEntityCollections<T>> = string & keyof OmitFunctions<OmitEntityCollections<T>>> = Partial<
  OnConflictOptions<T, K>
> &
  (DoNotReturnRecords | ReturnSelect<T>);
