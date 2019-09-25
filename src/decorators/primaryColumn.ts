import 'reflect-metadata';
import {
  getMetadataStorage,
  ColumnModifierMetadata,
} from '../metadata';

type ReturnFunctionType = (object: object, propertyName: string) => void;

export function primaryColumn(): ReturnFunctionType {
  return function primaryColumnDecorator(object: object, propertyName: string) {
    const metadataStorage = getMetadataStorage();
    metadataStorage.columnModifiers.push({
      primary: true,
      target: object.constructor.name,
      propertyName,
    } as ColumnModifierMetadata);
  };
}
