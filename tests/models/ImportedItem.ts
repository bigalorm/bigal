import { column, primaryColumn, table, Entity } from '../../src';

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
  public externalIdNoMaxLength?: string;

  @column({
    type: 'string',
    required: false,
    name: 'external_id_string',
    maxLength: 5,
  })
  public externalIdString?: string;

  @column({
    type: 'string[]',
    required: false,
    name: 'external_id_string_array',
    maxLength: 10,
  })
  public externalIdStringArray?: string[];
}
