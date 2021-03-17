import type { Entity } from '../Entity';
import type { ExcludeFunctionsAndEntityCollections, OmitFunctionsAndEntityCollections } from '../types';

export type SortString<T extends Entity> =
  | `${string & keyof OmitFunctionsAndEntityCollections<T>} ASC`
  | `${string & keyof OmitFunctionsAndEntityCollections<T>} asc`
  | `${string & keyof OmitFunctionsAndEntityCollections<T>} DESC`
  | `${string & keyof OmitFunctionsAndEntityCollections<T>} desc`
  | `${string & keyof OmitFunctionsAndEntityCollections<T>}`;

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

export type SortObjectValue = -1 | 'asc' | 'desc' | 1;

export type SortObject<T extends Entity> = {
  [K in keyof T as ExcludeFunctionsAndEntityCollections<T, K>]?: SortObjectValue;
};

export type Sort<T extends Entity> = MultipleSortString<T> | SortObject<T>;

export interface OrderBy<T extends Entity> {
  propertyName: string & keyof OmitFunctionsAndEntityCollections<T>;
  descending?: boolean;
}
