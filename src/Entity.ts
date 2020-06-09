export type EntityFieldValue = string | string[] | number | number[] | Date | boolean | boolean[] | Record<string, unknown> | null | unknown;

export interface Entity {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [index: string]: any;
}

export interface EntityStatic<T extends Entity> {

  // NOTE: Static methods
  beforeCreate?: (values: Partial<T>) => Partial<T> | Promise<Partial<T>>;
  beforeUpdate?: (values: Partial<T>) => Partial<T> | Promise<Partial<T>>;
  new(): T;
}
