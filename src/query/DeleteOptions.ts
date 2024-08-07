import type { Entity } from '../Entity.js';
import type { OmitEntityCollections, OmitFunctions } from '../types/index.js';

interface ReturnSelect<T extends Entity, K extends keyof T> {
  returnSelect: (K & string & keyof OmitFunctions<OmitEntityCollections<T>>)[];
  returnRecords?: true;
}

interface ReturnRecords<T extends Entity, K extends keyof T> {
  returnRecords: true;
  returnSelect?: (K & string & keyof OmitFunctions<OmitEntityCollections<T>>)[];
}

export type DeleteOptions<T extends Entity, K extends keyof T = keyof T> = ReturnRecords<T, K> | ReturnSelect<T, K>;
