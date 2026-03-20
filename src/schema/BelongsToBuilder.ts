import { assertValidSqlIdentifier } from '../utils/index.js';

import type { TableDefinition } from './TableDefinition.js';

/**
 * Lazy reference to a table definition, allowing circular references between models.
 * The arrow function defers evaluation until relationship resolution at registration time.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LazyTableReference = () => TableDefinition<any, any>;

export interface BelongsToConfig<TFkType = number> {
  brand: 'belongsTo';
  fkType: TFkType;
}

export class BelongsToBuilder<TFkType = number> {
  declare public readonly _: BelongsToConfig<TFkType>;

  public readonly dbColumnName: string;

  public readonly modelFn: LazyTableReference;

  public constructor(modelFn: LazyTableReference, dbColumnName: string) {
    assertValidSqlIdentifier(dbColumnName, 'belongsTo column name');
    this.modelFn = modelFn;
    this.dbColumnName = dbColumnName;
  }
}

export function belongsTo<TFkType = number>(modelFn: LazyTableReference, fkColumnName: string): BelongsToBuilder<TFkType> {
  return new BelongsToBuilder<TFkType>(modelFn, fkColumnName);
}
