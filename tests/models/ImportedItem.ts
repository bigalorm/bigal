import { column, Entity, primaryColumn, table } from '../../src/index.js';

@table({
  name: 'imported_item',
})
export class ImportedItem extends Entity {
  @primaryColumn({ type: 'string' })
  public id!: string;

  @column({
    type: 'string',
    required: true,
    name: 'name',
  })
  public name!: string;

  @column({
    type: 'string',
    required: false,
    name: 'external_id_no_max_length',
  })
  public externalIdNoMaxLength?: string | null;

  @column({
    type: 'string',
    required: false,
    name: 'external_id_string',
    maxLength: 5,
  })
  public externalIdString?: string | null;

  @column({
    type: 'string[]',
    required: false,
    name: 'external_id_string_array',
    maxLength: 10,
  })
  public externalIdStringArray?: string[] | null;

  @column({
    type: 'integer',
    required: false,
    name: 'unrelated',
    maxLength: 2,
  })
  public unrelated?: number;
}
