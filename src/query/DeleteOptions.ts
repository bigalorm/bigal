import type { Entity } from '../Entity';

interface ReturnSelect<T extends Entity> {
  returnSelect: (string & keyof T)[];
  returnRecords?: true;
}

interface ReturnRecords<T extends Entity> {
  returnRecords: true;
  returnSelect?: (string & keyof T)[];
}

export type DeleteOptions<T extends Entity> = ReturnRecords<T> | ReturnSelect<T>;
