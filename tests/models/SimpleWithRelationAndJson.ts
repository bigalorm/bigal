import { belongsTo, jsonb, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export interface IJsonLikeEntity {
  id: string;
  message: string;
}

export const simpleWithRelationAndJsonSchema = {
  ...modelBase,
  name: text().notNull(),
  store: belongsTo('Store'),
  message: jsonb<IJsonLikeEntity>(),
};

export type SimpleWithRelationAndJsonSelect = InferSelect<typeof simpleWithRelationAndJsonSchema>;
export type SimpleWithRelationAndJsonInsert = InferInsert<typeof simpleWithRelationAndJsonSchema>;
