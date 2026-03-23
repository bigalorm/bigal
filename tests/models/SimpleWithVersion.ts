import { integer, table, text } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export const SimpleWithVersion = table('simple_with_version', {
  ...modelBase,
  name: text().notNull(),
  version: integer().version(),
});
