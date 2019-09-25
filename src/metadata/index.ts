import { MetadataStorage } from './MetadataStorage';

interface GlobalWithBigAlMetadataArgsStorage {
  bigAlMetadataArgsStorage: MetadataStorage;
}

declare const global: GlobalWithBigAlMetadataArgsStorage;

export function getMetadataStorage(): MetadataStorage {
  if (!global.bigAlMetadataArgsStorage) {
    global.bigAlMetadataArgsStorage = new MetadataStorage();
  }

  return global.bigAlMetadataArgsStorage;
}

export * from './ColumnCollectionMetadata';
export * from './ColumnMetadata';
export * from './ColumnModelMetadata';
export * from './ColumnModifierMetadata';
export * from './ColumnTypeMetadata';
export * from './ModelMetadata';
