export interface BelongsToConfig<TFkType = number, TModelName extends string = string> {
  brand: 'belongsTo';
  fkType: TFkType;
  modelName: TModelName;
}

export class BelongsToBuilder<TFkType = number, TModelName extends string = string> {
  declare public readonly _: BelongsToConfig<TFkType, TModelName>;

  /** Explicit FK column name, or empty string to auto-derive from property key */
  public dbColumnName: string;

  public readonly modelRef: string;

  public constructor(modelRef: string, dbColumnName?: string) {
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
 * @param {string} modelRef - Model name string (resolved at initialize() time)
 * @param {string | object} [options] - FK column name string or options object with `name`
 */
export function belongsTo<TFkType = number, TModelName extends string = string>(modelRef: TModelName, options?: string | { name: string }): BelongsToBuilder<TFkType, TModelName> {
  const fkColumnName = typeof options === 'string' ? options : options?.name;
  return new BelongsToBuilder<TFkType, TModelName>(modelRef, fkColumnName);
}
