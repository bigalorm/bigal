import { belongsTo, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';

export const simpleWithStringIdSchema = {
  ...stringIdBase,
  name: text().notNull(),
  otherId: belongsTo<string>('SimpleWithStringId', 'other_id'),
};

export type SimpleWithStringIdSelect = InferSelect<typeof simpleWithStringIdSchema>;
export type SimpleWithStringIdInsert = InferInsert<typeof simpleWithStringIdSchema>;
