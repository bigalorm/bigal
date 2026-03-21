import type { TableDefinition } from './TableDefinition.js';

/**
 * A reference to another model — either a string model name (resolved at registration time)
 * or an arrow function returning a TableDefinition (for backward compatibility).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- opaque type to break circular inference
export type ModelReference = string | (() => TableDefinition<any, any>);

export interface BelongsToConfig<TFkType = number> {
  brand: 'belongsTo';
  fkType: TFkType;
}

export class BelongsToBuilder<TFkType = number> {
  declare public readonly _: BelongsToConfig<TFkType>;

  /** Explicit FK column name, or empty string to auto-derive from property key */
  public dbColumnName: string;

  public readonly modelRef: ModelReference;

  public constructor(modelRef: ModelReference, dbColumnName?: string) {
    this.modelRef = modelRef;
    this.dbColumnName = dbColumnName ?? '';
  }
}

/**
 * Defines a many-to-one (belongsTo) relationship.
 *
 * The FK column name is auto-derived as `snakeCase(propertyKey) + '_id'` by `table()`.
 * Pass an explicit name to override: `belongsTo('Store', { name: 'shop_id' })`.
 *
 * @param {string | Function} modelRef - Model name string or arrow function returning a TableDefinition
 * @param {string | object} [options] - FK column name string or options object with `name`
 */
export function belongsTo<TFkType = number>(
  modelRef: ModelReference,
  options?: string | { name: string },
): BelongsToBuilder<TFkType> {
  const fkColumnName = typeof options === 'string' ? options : options?.name;
  return new BelongsToBuilder<TFkType>(modelRef, fkColumnName);
}
