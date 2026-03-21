import { MetadataStorage } from './MetadataStorage.js';

interface GlobalWithBigAlMetadataArgsStorage<T extends Record<string, unknown>> {
  bigAlMetadataArgsStorage: MetadataStorage<T>;
}

declare const global: GlobalWithBigAlMetadataArgsStorage<Record<string, unknown>>;

export function getMetadataStorage<T extends Record<string, unknown>>(): MetadataStorage<T> {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!global.bigAlMetadataArgsStorage) {
    global.bigAlMetadataArgsStorage = new MetadataStorage();
  }

  return global.bigAlMetadataArgsStorage as MetadataStorage<T>;
}

export * from './ColumnBaseMetadata.js';
export * from './ColumnCollectionMetadata.js';
export * from './ColumnMetadata.js';
export * from './ColumnModelMetadata.js';
export * from './ColumnModifierMetadata.js';
export * from './ColumnTypeMetadata.js';
export * from './ModelMetadata.js';
