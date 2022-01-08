import type { Entity } from '../Entity';
import type { OmitEntityCollections, OmitFunctions } from '../types';

export interface ReturnSelect<T extends Entity, K extends keyof OmitFunctions<OmitEntityCollections<T>> = keyof OmitFunctions<OmitEntityCollections<T>>> {
  returnSelect: (K & string)[];
}
