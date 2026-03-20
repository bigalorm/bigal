import { belongsTo, jsonb, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase, tables } from './index.js';

export interface IJsonLikeEntity {
  id: string;
  message: string;
}

export const simpleWithRelationAndJsonSchema = {
  ...modelBase,
  name: text('name').notNull(),
  store: belongsTo(() => tables.Store!, 'store_id'),
  message: jsonb<IJsonLikeEntity>('message'),
};

export type SimpleWithRelationAndJsonSelect = InferSelect<typeof simpleWithRelationAndJsonSchema>;
export type SimpleWithRelationAndJsonInsert = InferInsert<typeof simpleWithRelationAndJsonSchema>;
