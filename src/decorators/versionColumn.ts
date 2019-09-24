import 'reflect-metadata';
import { getMetadataStorage } from '../metadata';
import { ColumnModifierMetadata } from '../metadata/ColumnModifierMetadata';

export function versionColumn(): Function {
  return function updateDateColumnDecorator(object: Object, propertyName: string) {
    const metadataStorage = getMetadataStorage();
    metadataStorage.columnModifiers.push({
      version: true,
      entity: object.constructor.name,
      propertyName,
    } as ColumnModifierMetadata);
  };
}
