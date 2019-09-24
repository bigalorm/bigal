import 'reflect-metadata';
import { getMetadataStorage } from '../metadata';
import { ColumnModifierMetadata } from '../metadata/ColumnModifierMetadata';

export function updateDateColumn(): Function {
  return function updateDateColumnDecorator(object: Object, propertyName: string) {
    const metadataStorage = getMetadataStorage();
    metadataStorage.columnModifiers.push({
      updateDate: true,
      entity: object.constructor.name,
      propertyName,
    } as ColumnModifierMetadata);
  };
}
