export interface ReturnSelect<T> {
  returnSelect: (string & keyof T)[];
}
