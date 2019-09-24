import 'reflect-metadata';
import { getMetadataStorage } from '../metadata';
import { ColumnModifierMetadata } from '../metadata/ColumnModifierMetadata';

export function createDateColumn(): Function {
  return function createDateColumnDecorator(object: Object, propertyName: string) {
    const metadataStorage = getMetadataStorage();
    metadataStorage.columnModifiers.push({
      createDate: true,
      entity: object.constructor.name,
      propertyName,
    } as ColumnModifierMetadata);
  };
}
