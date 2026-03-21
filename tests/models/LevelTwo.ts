import { belongsTo, table, text } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';

export const LevelTwo = table('level_two', {
  ...stringIdBase,
  two: text().notNull(),
  foo: text(),
  levelThree: belongsTo<string>('LevelThree'),
});
