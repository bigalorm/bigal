import type { OmitFunctions } from '../types/index.js';

export interface ReturnSelect<T extends Record<string, unknown>, K extends keyof OmitFunctions<T> = keyof OmitFunctions<T>> {
  returnSelect: (K & string)[];
}
