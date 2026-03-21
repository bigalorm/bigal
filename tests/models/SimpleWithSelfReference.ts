import { belongsTo, hasMany, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';

export const simpleWithSelfReferenceSchema = {
  ...stringIdBase,
  name: text().notNull(),
  source: belongsTo<string>('SimpleWithSelfReference'),
  translations: hasMany('SimpleWithSelfReference').via('source'),
};

export type SimpleWithSelfReferenceSelect = InferSelect<typeof simpleWithSelfReferenceSchema>;
export type SimpleWithSelfReferenceInsert = InferInsert<typeof simpleWithSelfReferenceSchema>;
