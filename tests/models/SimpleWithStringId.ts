import { belongsTo, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';
import { tables } from './index.js';

export const simpleWithStringIdSchema = {
  ...stringIdBase,
  name: text().notNull(),
  otherId: belongsTo<string>(() => tables.SimpleWithStringId!, 'other_id'),
};

export type SimpleWithStringIdSelect = InferSelect<typeof simpleWithStringIdSchema>;
export type SimpleWithStringIdInsert = InferInsert<typeof simpleWithStringIdSchema>;
