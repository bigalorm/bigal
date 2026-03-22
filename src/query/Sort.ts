import type { ExcludeFunctions, OmitEntityCollections, OmitFunctions } from '../types/index.js';

export type SortString<T extends Record<string, unknown>> =
  | `${string & keyof OmitFunctions<OmitEntityCollections<T>>} ASC`
  | `${string & keyof OmitFunctions<OmitEntityCollections<T>>} asc`
  | `${string & keyof OmitFunctions<OmitEntityCollections<T>>} DESC`
  | `${string & keyof OmitFunctions<OmitEntityCollections<T>>} desc`
  | (string & keyof OmitFunctions<OmitEntityCollections<T>>);

type ValidateMultipleSorts<
  T extends Record<string, unknown>,
  TNextSortPart extends string,
  TPreviouslyValidatedSortString extends string,
  TSortString extends string,
> = TNextSortPart extends `, ${SortString<T>}${infer TRestSortPart}`
  ? TRestSortPart extends ''
    ? TSortString
    : ValidateMultipleSorts<T, TRestSortPart, TNextSortPart extends `${infer TValidatedSortPart}${TRestSortPart}` ? `${TPreviouslyValidatedSortString}${TValidatedSortPart}` : never, TSortString>
  : `${TPreviouslyValidatedSortString}, ${SortString<T>}`;

export type MultipleSortString<T extends Record<string, unknown>, TSortString extends string = string> = TSortString extends `${SortString<T>}${infer TRestSortPart}`
  ? TRestSortPart extends ''
    ? TSortString
    : ValidateMultipleSorts<T, TRestSortPart, TSortString extends `${infer TPreviouslyValidatedSortString}${TRestSortPart}` ? TPreviouslyValidatedSortString : never, TSortString>
  : SortString<T>;

export type SortObjectValue = -1 | 'asc' | 'desc' | 1;

export interface VectorDistanceSort {
  nearestTo: number[];
  metric?: VectorDistanceMetric;
}

export type SortObject<T extends Record<string, unknown>> = {
  [K in keyof T as ExcludeFunctions<OmitEntityCollections<T>, K>]?: SortObjectValue | VectorDistanceSort;
};

export type Sort<T extends Record<string, unknown>> = MultipleSortString<T> | SortObject<T>;

export type VectorDistanceMetric = 'cosine' | 'innerProduct' | 'l1' | 'l2';

export interface OrderBy<T extends Record<string, unknown>> {
  propertyName: string & keyof OmitFunctions<OmitEntityCollections<T>>;
  descending?: boolean;
  vectorDistance?: {
    vector: number[];
    metric: VectorDistanceMetric;
  };
}
