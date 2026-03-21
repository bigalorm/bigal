import { text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';

export const levelThreeSchema = {
  ...stringIdBase,
  foo: text(),
  three: text().notNull(),
};

export type LevelThreeSelect = InferSelect<typeof levelThreeSchema>;
export type LevelThreeInsert = InferInsert<typeof levelThreeSchema>;
