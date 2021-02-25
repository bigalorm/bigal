import type { EntityFieldValue, Entity } from '../Entity';

export type WhereClauseValue<T extends Entity> = EntityFieldValue | WhereQuery<T>;

export type WhereQuery<T extends Entity> = {
  [P in keyof T]?: WhereClauseValue<T>;
} & {
  or?: WhereQuery<T>[];
};
