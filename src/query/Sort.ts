import type { Entity } from '../Entity';

export type SortString<T extends Entity> = `${string & keyof T} ASC` | `${string & keyof T} asc` | `${string & keyof T} DESC` | `${string & keyof T} desc` | `${string & keyof T}`;

type ValidateMultipleSorts<
  T extends Entity,
  TNextSortPart extends string,
  TPreviouslyValidatedSortString extends string,
  TSortString extends string
> = TNextSortPart extends `, ${SortString<T>}${infer TRestSortPart}`
  ? TRestSortPart extends ''
    ? TSortString
    : ValidateMultipleSorts<T, TRestSortPart, TNextSortPart extends `${infer TValidatedSortPart}${TRestSortPart}` ? `${TPreviouslyValidatedSortString}${TValidatedSortPart}` : never, TSortString>
  : `${TPreviouslyValidatedSortString}, ${SortString<T>}`;

export type MultipleSortString<T extends Entity, TSortString extends string = string> = TSortString extends `${SortString<T>}${infer TRestSortPart}`
  ? TRestSortPart extends ''
    ? TSortString
    : ValidateMultipleSorts<T, TRestSortPart, TSortString extends `${infer TPreviouslyValidatedSortString}${TRestSortPart}` ? TPreviouslyValidatedSortString : never, TSortString>
  : SortString<T>;

export type SortObject<T extends Entity> = {
  [K in keyof T]?: -1 | 'asc' | 'desc' | 1;
};

export type Sort<T extends Entity> = MultipleSortString<T> | SortObject<T>;

export interface OrderBy<T extends Entity> {
  propertyName: string & keyof T;
  descending?: boolean;
}
