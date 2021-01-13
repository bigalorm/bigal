import type { EntityFieldValue } from '../Entity';

export type WhereClauseValue = EntityFieldValue | WhereQuery;

export interface WhereQuery {
  [index: string]: WhereClauseValue;
}

export type WhereQueryTyped<T> = {
  [P in keyof T]?: WhereClauseValue;
} & {
  where?: WhereQueryTyped<T>;
  or?: OrQuery<T>[];
};

type OrQuery<T> = {
  [P in keyof T]?: WhereClauseValue;
};
