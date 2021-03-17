import type { Entity } from '../Entity';
import type { OmitFunctionsAndEntityCollections } from '../types';

export interface ReturnSelect<T extends Entity> {
  returnSelect: (string & keyof OmitFunctionsAndEntityCollections<T>)[];
}
