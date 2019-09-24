export interface ColumnModifierMetadata {
  entity: string;
  propertyName: string;
  primary?: boolean;
  createDate?: boolean;
  updateDate?: boolean;
  version?: boolean;
}
