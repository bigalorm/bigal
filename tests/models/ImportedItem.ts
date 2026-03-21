import { integer, table, text, textArray, varchar } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';

const externalIdStringArray = textArray();
externalIdStringArray.config.maxLength = 10;

const unrelatedColumn = integer();
unrelatedColumn.config.maxLength = 2;

export const ImportedItem = table('imported_item', {
  ...stringIdBase,
  name: text().notNull(),
  externalIdNoMaxLength: text(),
  externalIdString: varchar({ length: 5 }),
  externalIdStringArray,
  unrelated: unrelatedColumn,
});
