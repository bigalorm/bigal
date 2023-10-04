export interface ClassLike {
  /**
   * Returns the name of the function. Function names are read-only and can not be changed.
   */
  readonly constructor: {
    readonly name: string;
  };
}
