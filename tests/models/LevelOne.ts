import { belongsTo, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';
import { tables } from './index.js';

export const levelOneSchema = {
  ...stringIdBase,
  one: text().notNull(),
  foo: text(),
  levelTwo: belongsTo<string>(() => tables.LevelTwo!),
};

export type LevelOneSelect = InferSelect<typeof levelOneSchema>;
export type LevelOneInsert = InferInsert<typeof levelOneSchema>;
