import { belongsTo, hasMany, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';
import { tables } from './index.js';

export const simpleWithSelfReferenceSchema = {
  ...stringIdBase,
  name: text().notNull(),
  source: belongsTo<string>(() => tables.SimpleWithSelfReference!),
  translations: hasMany(() => tables.SimpleWithSelfReference!).via('source'),
};

export type SimpleWithSelfReferenceSelect = InferSelect<typeof simpleWithSelfReferenceSchema>;
export type SimpleWithSelfReferenceInsert = InferInsert<typeof simpleWithSelfReferenceSchema>;
