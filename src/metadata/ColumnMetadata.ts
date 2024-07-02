import type { ColumnCollectionMetadata } from './ColumnCollectionMetadata.js';
import type { ColumnModelMetadata } from './ColumnModelMetadata.js';
import type { ColumnTypeMetadata } from './ColumnTypeMetadata.js';

export type ColumnMetadata = ColumnCollectionMetadata | ColumnModelMetadata | ColumnTypeMetadata;
