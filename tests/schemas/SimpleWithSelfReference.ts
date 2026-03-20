import { belongsTo, hasMany, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { stringIdBase, tables } from './index.js';

export const simpleWithSelfReferenceSchema = {
  ...stringIdBase,
  name: text('name').notNull(),
  source: belongsTo<string>(() => tables.SimpleWithSelfReference!, 'source_id'),
  translations: hasMany(() => tables.SimpleWithSelfReference!).via('source'),
};

export type SimpleWithSelfReferenceSelect = InferSelect<typeof simpleWithSelfReferenceSchema>;
export type SimpleWithSelfReferenceInsert = InferInsert<typeof simpleWithSelfReferenceSchema>;
