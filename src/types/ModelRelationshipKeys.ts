import type { Entity } from '../Entity.js';

export type ModelRelationshipKeys<T extends Entity> = {
  [K in keyof T]: Extract<T[K], Entity> extends never ? never : K;
}[keyof T] &
  string;
