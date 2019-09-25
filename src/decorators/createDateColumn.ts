import 'reflect-metadata';
import {
  getMetadataStorage,
  ColumnModifierMetadata,
} from '../metadata';

export function createDateColumn(): Function {
  return function createDateColumnDecorator(object: Object, propertyName: string) {
    const metadataStorage = getMetadataStorage();
    metadataStorage.columnModifiers.push({
      createDate: true,
      target: object.constructor.name,
      propertyName,
    } as ColumnModifierMetadata);
  };
}
