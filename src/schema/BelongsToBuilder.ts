import type { TableDefinition } from './TableDefinition.js';

/**
 * Lazy reference to a table definition, allowing circular references between models.
 * The arrow function defers evaluation until relationship resolution at registration time.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- opaque type to break circular inference
export type LazyTableReference = () => TableDefinition<any, any>;

export interface BelongsToConfig<TFkType = number> {
  brand: 'belongsTo';
  fkType: TFkType;
}

export class BelongsToBuilder<TFkType = number> {
  declare public readonly _: BelongsToConfig<TFkType>;

  /** Explicit FK column name, or empty string to auto-derive from property key */
  public dbColumnName: string;

  public readonly modelFn: LazyTableReference;

  public constructor(modelFn: LazyTableReference, dbColumnName?: string) {
    this.modelFn = modelFn;
    this.dbColumnName = dbColumnName ?? '';
  }
}

/**
 * Defines a many-to-one (belongsTo) relationship.
 *
 * The FK column name is auto-derived as `snakeCase(propertyKey) + '_id'` by `table()`.
 * Pass an explicit name to override: `belongsTo(() => Store, { name: 'shop_id' })`.
 */
export function belongsTo<TFkType = number>(modelFn: LazyTableReference, options?: string | { name: string }): BelongsToBuilder<TFkType> {
  const fkColumnName = typeof options === 'string' ? options : options?.name;
  return new BelongsToBuilder<TFkType>(modelFn, fkColumnName);
}
