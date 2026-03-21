import { integer, text, textArray, varchar } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';

const externalIdStringArray = textArray();
externalIdStringArray.config.maxLength = 10;

const unrelatedColumn = integer();
unrelatedColumn.config.maxLength = 2;

export const importedItemSchema = {
  ...stringIdBase,
  name: text().notNull(),
  externalIdNoMaxLength: text(),
  externalIdString: varchar({ length: 5 }),
  externalIdStringArray,
  unrelated: unrelatedColumn,
};

export type ImportedItemSelect = InferSelect<typeof importedItemSchema>;
export type ImportedItemInsert = InferInsert<typeof importedItemSchema>;
