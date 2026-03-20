import { integer, text, textArray, varchar } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { stringIdBase } from './index.js';

const externalIdStringArray = textArray('external_id_string_array');
externalIdStringArray.config.maxLength = 10;

const unrelatedColumn = integer('unrelated');
unrelatedColumn.config.maxLength = 2;

export const importedItemSchema = {
  ...stringIdBase,
  name: text('name').notNull(),
  externalIdNoMaxLength: text('external_id_no_max_length'),
  externalIdString: varchar('external_id_string', { length: 5 }),
  externalIdStringArray,
  unrelated: unrelatedColumn,
};

export type ImportedItemSelect = InferSelect<typeof importedItemSchema>;
export type ImportedItemInsert = InferInsert<typeof importedItemSchema>;
