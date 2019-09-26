import { Entity } from '../../src';
import { ModelBase } from './ModelBase';
import {
  column,
  table,
} from '../../src/decorators';

@table({
  name: 'categories',
})
export class Category extends ModelBase implements Entity {
  @column({
    type: 'string',
    required: true,
  })
  public name!: string;
}
