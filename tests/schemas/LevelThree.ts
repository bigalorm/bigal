import { text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { stringIdBase } from './index.js';

export const levelThreeSchema = {
  ...stringIdBase,
  foo: text('foo'),
  three: text('three').notNull(),
};

export type LevelThreeSelect = InferSelect<typeof levelThreeSchema>;
export type LevelThreeInsert = InferInsert<typeof levelThreeSchema>;
