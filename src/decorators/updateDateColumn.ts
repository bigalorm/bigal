import 'reflect-metadata';
import {
  getMetadataStorage,
  ColumnModifierMetadata,
} from '../metadata';

export function updateDateColumn(): Function {
  return function updateDateColumnDecorator(object: Object, propertyName: string) {
    const metadataStorage = getMetadataStorage();
    metadataStorage.columnModifiers.push({
      updateDate: true,
      target: object.constructor.name,
      propertyName,
    } as ColumnModifierMetadata);
  };
}
