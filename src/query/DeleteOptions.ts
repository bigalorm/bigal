import { type Entity } from '../Entity.js';
import { type OmitEntityCollections, type OmitFunctions } from '../types/index.js';

import { type ExecutionOptions } from './ExecutionOptions.js';

interface ReturnSelect<T extends Entity, K extends keyof T> {
  returnSelect: (K & string & keyof OmitFunctions<OmitEntityCollections<T>>)[];
  returnRecords?: true;
}

interface ReturnRecords<T extends Entity, K extends keyof T> {
  returnRecords: true;
  returnSelect?: (K & string & keyof OmitFunctions<OmitEntityCollections<T>>)[];
}

interface DoNotReturnRecords {
  returnRecords?: false;
  returnSelect?: never;
}

export type DeleteOptions<T extends Entity, K extends keyof T = keyof T> = ExecutionOptions & (DoNotReturnRecords | ReturnRecords<T, K> | ReturnSelect<T, K>);
