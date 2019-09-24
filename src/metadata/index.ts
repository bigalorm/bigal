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
