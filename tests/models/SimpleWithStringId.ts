import { belongsTo, table, text } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';

export const SimpleWithStringId = table('simple', {
  ...stringIdBase,
  name: text().notNull(),
  otherId: belongsTo<string>('SimpleWithStringId', 'other_id'),
}, { modelName: 'SimpleWithStringId' });
