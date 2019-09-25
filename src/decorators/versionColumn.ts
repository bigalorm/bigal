import 'reflect-metadata';
import {
  getMetadataStorage,
  ColumnModifierMetadata,
} from '../metadata';

export function versionColumn(): Function {
  return function updateDateColumnDecorator(object: Object, propertyName: string) {
    const metadataStorage = getMetadataStorage();
    metadataStorage.columnModifiers.push({
      version: true,
      target: object.constructor.name,
      propertyName,
    } as ColumnModifierMetadata);
  };
}
