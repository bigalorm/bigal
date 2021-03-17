import type { EntityFieldValue, Entity } from '../Entity';
import type { OmitFunctionsAndEntityCollections } from '../types';

export type WhereClauseValue<T extends Entity> = EntityFieldValue | WhereQuery<T>;

export type WhereQuery<T extends Entity> = {
  [P in keyof OmitFunctionsAndEntityCollections<T>]?: WhereClauseValue<T>;
} & {
  or?: WhereQuery<T>[];
};
