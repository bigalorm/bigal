import type { Entity } from '../Entity';
import type { OmitFunctionsAndEntityCollections } from '../types';

interface ReturnSelect<T extends Entity> {
  returnSelect: (string & keyof OmitFunctionsAndEntityCollections<T>)[];
  returnRecords?: true;
}

interface ReturnRecords<T extends Entity> {
  returnRecords: true;
  returnSelect?: (string & keyof OmitFunctionsAndEntityCollections<T>)[];
}

export type DeleteOptions<T extends Entity> = ReturnRecords<T> | ReturnSelect<T>;
