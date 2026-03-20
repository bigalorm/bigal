import { belongsTo, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { stringIdBase, tables } from './index.js';

export const levelTwoSchema = {
  ...stringIdBase,
  two: text('two').notNull(),
  foo: text('foo'),
  levelThree: belongsTo<string>(() => tables.LevelThree!, 'level_three_id'),
};

export type LevelTwoSelect = InferSelect<typeof levelTwoSchema>;
export type LevelTwoInsert = InferInsert<typeof levelTwoSchema>;
