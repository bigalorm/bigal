import type { OmitFunctions } from '../types/index.js';

interface ReturnSelect<T extends Record<string, unknown>, K extends keyof T> {
  returnSelect: (K & string & keyof OmitFunctions<T>)[];
  returnRecords?: true;
}

interface ReturnRecords<T extends Record<string, unknown>, K extends keyof T> {
  returnRecords: true;
  returnSelect?: (K & string & keyof OmitFunctions<T>)[];
}

export type DeleteOptions<T extends Record<string, unknown>, K extends keyof T = keyof T> = ReturnRecords<T, K> | ReturnSelect<T, K>;
