import { text, textArray } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase } from './index.js';

export const simpleWithStringCollectionSchema = {
  ...modelBase,
  name: text('name').notNull(),
  otherIds: textArray('other_ids').default([]),
};

export type SimpleWithStringCollectionSelect = InferSelect<typeof simpleWithStringCollectionSchema>;
export type SimpleWithStringCollectionInsert = InferInsert<typeof simpleWithStringCollectionSchema>;
