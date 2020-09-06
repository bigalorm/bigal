import { MetadataStorage } from './MetadataStorage';
import { Entity } from '../Entity';

interface GlobalWithBigAlMetadataArgsStorage<T extends Entity> {
  bigAlMetadataArgsStorage: MetadataStorage<T>;
}

declare const global: GlobalWithBigAlMetadataArgsStorage<Entity>;

export function getMetadataStorage<T extends Entity>(): MetadataStorage<T> {
  if (!global.bigAlMetadataArgsStorage) {
    global.bigAlMetadataArgsStorage = new MetadataStorage();
  }

  return global.bigAlMetadataArgsStorage as MetadataStorage<T>;
}

export * from './ColumnCollectionMetadata';
export * from './ColumnMetadata';
export * from './ColumnModelMetadata';
export * from './ColumnModifierMetadata';
export * from './ColumnTypeMetadata';
export * from './ModelMetadata';
