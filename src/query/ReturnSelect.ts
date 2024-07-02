import type { Entity } from '../Entity.js';
import type { OmitEntityCollections, OmitFunctions } from '../types/index.js';

export interface ReturnSelect<T extends Entity, K extends keyof OmitFunctions<OmitEntityCollections<T>> = keyof OmitFunctions<OmitEntityCollections<T>>> {
  returnSelect: (K & string)[];
}
