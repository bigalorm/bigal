import type { Entity, EntityFieldValue } from '../Entity';

export type WhereClauseValue = Entity | EntityFieldValue | WhereQuery;

export interface WhereQuery {
  [index: string]: WhereClauseValue;
}
