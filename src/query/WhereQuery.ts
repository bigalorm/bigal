import { Entity, EntityFieldValue } from '../Entity';

export type WhereClauseValue = EntityFieldValue | Entity | WhereQuery;

export interface WhereQuery {
  [index: string]: WhereClauseValue;
}
