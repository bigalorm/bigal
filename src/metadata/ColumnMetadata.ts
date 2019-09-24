import { ColumnCollectionMetadata } from './ColumnCollectionMetadata';
import { ColumnModelMetadata } from './ColumnModelMetadata';
import { ColumnTypeMetadata } from './ColumnTypeMetadata';

export type ColumnMetadata = ColumnCollectionMetadata | ColumnModelMetadata | ColumnTypeMetadata;
