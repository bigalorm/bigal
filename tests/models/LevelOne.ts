import { belongsTo, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';

export const levelOneSchema = {
  ...stringIdBase,
  one: text().notNull(),
  foo: text(),
  levelTwo: belongsTo<string>('LevelTwo'),
};

export type LevelOneSelect = InferSelect<typeof levelOneSchema>;
export type LevelOneInsert = InferInsert<typeof levelOneSchema>;
