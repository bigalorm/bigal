export interface ColumnModifierMetadata {
  // Name of the class with @table decorator
  target: string;
  propertyName: string;
  primary?: boolean;
  createDate?: boolean;
  updateDate?: boolean;
  version?: boolean;
}
