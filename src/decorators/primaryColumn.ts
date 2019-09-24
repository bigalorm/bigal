import 'reflect-metadata';
import { getMetadataStorage } from '../metadata';
import { ColumnModifierMetadata } from '../metadata/ColumnModifierMetadata';

export function primaryColumn(): Function {
  return function primaryColumnDecorator(object: Object, propertyName: string) {
    const metadataStorage = getMetadataStorage();
    metadataStorage.columnModifiers.push({
      primary: true,
      entity: object.constructor.name,
      propertyName,
    } as ColumnModifierMetadata);
  };
}
