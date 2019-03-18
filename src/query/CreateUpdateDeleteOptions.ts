export interface DoNotReturnRecords {
  returnRecords: false;
  returnSelect: [];
}

export interface CreateUpdateDeleteOptions {
  returnRecords: boolean;
  returnSelect?: string[];
}
