import type { CreateOrUpdateParams } from './types';

export type EntityFieldValue = boolean[] | Date | number[] | Record<string, unknown> | string[] | boolean | number | string | unknown | null;

export abstract class Entity {
  public abstract id: unknown;
}

export interface EntityStatic<T extends Entity> {
  // NOTE: Static methods
  beforeCreate?: (values: CreateOrUpdateParams<T>) => CreateOrUpdateParams<T> | Promise<CreateOrUpdateParams<T>>;
  beforeUpdate?: (values: CreateOrUpdateParams<T>) => CreateOrUpdateParams<T> | Promise<CreateOrUpdateParams<T>>;
  new (): T;
}
