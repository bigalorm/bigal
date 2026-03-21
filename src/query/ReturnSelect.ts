import type { OmitEntityCollections, OmitFunctions } from '../types/index.js';

export interface ReturnSelect<T extends Record<string, unknown>, K extends keyof OmitFunctions<OmitEntityCollections<T>> = keyof OmitFunctions<OmitEntityCollections<T>>> {
  returnSelect: (K & string)[];
}
