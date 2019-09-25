import 'reflect-metadata';
import {
  getMetadataStorage,
  ColumnModifierMetadata,
} from '../metadata';

type ReturnFunctionType = (object: object, propertyName: string) => void;

export function updateDateColumn(): ReturnFunctionType {
  return function updateDateColumnDecorator(object: object, propertyName: string) {
    const metadataStorage = getMetadataStorage();
    metadataStorage.columnModifiers.push({
      updateDate: true,
      target: object.constructor.name,
      propertyName,
    } as ColumnModifierMetadata);
  };
}
