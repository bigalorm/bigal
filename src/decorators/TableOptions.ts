export interface TableOptions {
  /**
   * Table name in the database
   */
  name?: string;

  /**
   * Schema table belongs to in the database
   */
  schema?: string;

  /**
   * Connection name to use for queries
   */
  connection?: string;

  /**
   * Indicates if create, update, delete statements should be available
   */
  readonly?: boolean;
}
