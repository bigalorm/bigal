import type { ColumnCollectionMetadata } from './ColumnCollectionMetadata';
import type { ColumnModelMetadata } from './ColumnModelMetadata';
import type { ColumnTypeMetadata } from './ColumnTypeMetadata';

export type ColumnMetadata = ColumnCollectionMetadata | ColumnModelMetadata | ColumnTypeMetadata;
