import type { CreateUpdateParams } from './types';

export type EntityFieldValue = boolean[] | Date | number[] | Record<string, unknown> | string[] | boolean | number | string | unknown | null;

export abstract class Entity {
  public abstract id: unknown;
}

export interface EntityStatic<T extends Entity> {
  // NOTE: Static methods
  beforeCreate?: (values: CreateUpdateParams<T>) => CreateUpdateParams<T> | Promise<CreateUpdateParams<T>>;
  beforeUpdate?: (values: CreateUpdateParams<T>) => CreateUpdateParams<T> | Promise<CreateUpdateParams<T>>;
  new (): T;
}
