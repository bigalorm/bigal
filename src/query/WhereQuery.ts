import type { EntityFieldValue } from '../Entity';

export type WhereClauseValue<T> = EntityFieldValue | WhereQuery<T>;

export type WhereQuery<T> = {
  [P in keyof T]?: WhereClauseValue<T>;
} & {
  or?: WhereQuery<T>[];
};
