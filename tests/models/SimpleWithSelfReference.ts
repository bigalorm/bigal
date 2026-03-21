import { belongsTo, hasMany, table, text } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';

export const SimpleWithSelfReference = table('simple', {
  ...stringIdBase,
  name: text().notNull(),
  source: belongsTo<string>('SimpleWithSelfReference'),
  translations: hasMany('SimpleWithSelfReference').via('source'),
}, { modelName: 'SimpleWithSelfReference' });
