import { table, text } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';

export const LevelThree = table('level_three', {
  ...stringIdBase,
  foo: text(),
  three: text().notNull(),
});
