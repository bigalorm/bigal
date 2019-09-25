import 'reflect-metadata';
import {
  getMetadataStorage,
  ColumnModifierMetadata,
} from '../metadata';

export function primaryColumn(): Function {
  return function primaryColumnDecorator(object: Object, propertyName: string) {
    const metadataStorage = getMetadataStorage();
    metadataStorage.columnModifiers.push({
      primary: true,
      target: object.constructor.name,
      propertyName,
    } as ColumnModifierMetadata);
  };
}
