import { integer, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase } from './index.js';

const versionColumn = integer('version').notNull();
versionColumn.config.isVersion = true;

export const simpleWithVersionSchema = {
  ...modelBase,
  name: text('name').notNull(),
  version: versionColumn,
};

export type SimpleWithVersionSelect = InferSelect<typeof simpleWithVersionSchema>;
export type SimpleWithVersionInsert = InferInsert<typeof simpleWithVersionSchema>;
