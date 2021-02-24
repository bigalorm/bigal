export type SortString<T> = `${string & keyof T} ASC` | `${string & keyof T} asc` | `${string & keyof T} DESC` | `${string & keyof T} desc` | `${string & keyof T}`;

type ValidateMultipleSorts<
  T,
  TNextSortPart extends string,
  TPreviouslyValidatedSortString extends string,
  TSortString extends string
> = TNextSortPart extends `, ${SortString<T>}${infer TRestSortPart}`
  ? TRestSortPart extends ''
    ? TSortString
    : ValidateMultipleSorts<T, TRestSortPart, TNextSortPart extends `${infer TValidatedSortPart}${TRestSortPart}` ? `${TPreviouslyValidatedSortString}${TValidatedSortPart}` : never, TSortString>
  : `${TPreviouslyValidatedSortString}, ${SortString<T>}`;

export type MultipleSortString<T, TSortString extends string = string> = TSortString extends `${SortString<T>}${infer TRestSortPart}`
  ? TRestSortPart extends ''
    ? TSortString
    : ValidateMultipleSorts<T, TRestSortPart, TSortString extends `${infer TPreviouslyValidatedSortString}${TRestSortPart}` ? TPreviouslyValidatedSortString : never, TSortString>
  : SortString<T>;

export type SortObject<T> = {
  [K in keyof T]: -1 | 'asc' | 'desc' | 1;
};

export type Sort<T> = MultipleSortString<T> | SortObject<T>;

export interface OrderBy<T> {
  propertyName: string & keyof T;
  descending?: boolean;
}
