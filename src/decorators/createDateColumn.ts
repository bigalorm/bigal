import 'reflect-metadata';
import {
  getMetadataStorage,
  ColumnModifierMetadata,
} from '../metadata';

type ReturnFunctionType = (object: object, propertyName: string) => void;

export function createDateColumn(): ReturnFunctionType {
  return function createDateColumnDecorator(object: object, propertyName: string) {
    const metadataStorage = getMetadataStorage();
    metadataStorage.columnModifiers.push({
      createDate: true,
      target: object.constructor.name,
      propertyName,
    } as ColumnModifierMetadata);
  };
}
