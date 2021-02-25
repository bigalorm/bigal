import type { Entity } from '../Entity';

export interface ReturnSelect<T extends Entity> {
  returnSelect: (string & keyof T)[];
}
