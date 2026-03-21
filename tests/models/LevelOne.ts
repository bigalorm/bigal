import { belongsTo, table, text } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';

export const LevelOne = table('level_one', {
  ...stringIdBase,
  one: text().notNull(),
  foo: text(),
  levelTwo: belongsTo<string>('LevelTwo'),
});
