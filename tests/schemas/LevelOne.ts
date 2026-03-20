import { belongsTo, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { stringIdBase, tables } from './index.js';

export const levelOneSchema = {
  ...stringIdBase,
  one: text('one').notNull(),
  foo: text('foo'),
  levelTwo: belongsTo<string>(() => tables.LevelTwo!, 'level_two_id'),
};

export type LevelOneSelect = InferSelect<typeof levelOneSchema>;
export type LevelOneInsert = InferInsert<typeof levelOneSchema>;
