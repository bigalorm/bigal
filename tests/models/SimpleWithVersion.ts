import { integer, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { modelBase } from './base.js';

const versionColumn = integer().notNull();
versionColumn.config.isVersion = true;

export const simpleWithVersionSchema = {
  ...modelBase,
  name: text().notNull(),
  version: versionColumn,
};

export type SimpleWithVersionSelect = InferSelect<typeof simpleWithVersionSchema>;
export type SimpleWithVersionInsert = InferInsert<typeof simpleWithVersionSchema>;
