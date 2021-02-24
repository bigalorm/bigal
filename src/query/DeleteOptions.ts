interface ReturnSelect<T> {
  returnSelect: (string & keyof T)[];
  returnRecords?: true;
}

interface ReturnRecords<T> {
  returnRecords: true;
  returnSelect?: (string & keyof T)[];
}

export type DeleteOptions<T> = ReturnRecords<T> | ReturnSelect<T>;
