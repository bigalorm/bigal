interface ReturnSelect {
  returnSelect: string[];
  returnRecords?: true;
}

interface ReturnRecords {
  returnRecords: true;
  returnSelect?: string[];
}

export type DeleteOptions = ReturnSelect | ReturnRecords;
