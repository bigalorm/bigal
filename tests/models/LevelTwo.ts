import { belongsTo, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';

export const levelTwoSchema = {
  ...stringIdBase,
  two: text().notNull(),
  foo: text(),
  levelThree: belongsTo<string>('LevelThree'),
};

export type LevelTwoSelect = InferSelect<typeof levelTwoSchema>;
export type LevelTwoInsert = InferInsert<typeof levelTwoSchema>;
