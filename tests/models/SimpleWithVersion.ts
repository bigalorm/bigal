import { integer, table, text } from '../../src/schema/index.js';

import { modelBase } from './base.js';

const versionColumn = integer().notNull();
versionColumn.config.isVersion = true;

export const SimpleWithVersion = table('simple_with_version', {
  ...modelBase,
  name: text().notNull(),
  version: versionColumn,
});
