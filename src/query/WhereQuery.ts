import { Entity } from '../Entity';

export type WhereClauseValue = string | string[] | number | number[] | Date | boolean | object | null | Entity | WhereQuery;

export interface WhereQuery {
  [index: string]: WhereClauseValue;
}
