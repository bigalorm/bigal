import { text, textArray } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const simpleWithStringCollectionSchema = {
  ...modelBase,
  name: text().notNull(),
  otherIds: textArray().default([]),
};

export type SimpleWithStringCollectionSelect = InferSelect<typeof simpleWithStringCollectionSchema>;
export type SimpleWithStringCollectionInsert = InferInsert<typeof simpleWithStringCollectionSchema>;
