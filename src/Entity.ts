import type { CreateOrUpdateParams } from './types';

export type EntityFieldValue = boolean[] | Date | number[] | Record<string, unknown> | string[] | boolean | number | string | unknown | null;

// NOTE: Using declaration merging so that IsValueOfType can identify classes that extend Entity, while
// not having __bigAlEntity carry over/transpile to subclassed objects
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export abstract class Entity {}
export interface Entity {
  __bigAlEntity?: true;
  id?: unknown;
}

export interface EntityStatic<T extends Entity> {
  // NOTE: Static methods
  beforeCreate?: (values: CreateOrUpdateParams<T>) => CreateOrUpdateParams<T> | Promise<CreateOrUpdateParams<T>>;
  beforeUpdate?: (values: CreateOrUpdateParams<T>) => CreateOrUpdateParams<T> | Promise<CreateOrUpdateParams<T>>;
  new (): T;
}
