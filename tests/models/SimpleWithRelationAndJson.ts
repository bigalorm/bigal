import { belongsTo, jsonb, table, text } from '../../src/schema/index.js';

import { modelBase } from './base.js';

export interface IJsonLikeEntity {
  id: string;
  message: string;
}

export const SimpleWithRelationAndJson = table('simple', {
  ...modelBase,
  name: text().notNull(),
  store: belongsTo('Store'),
  message: jsonb<IJsonLikeEntity>(),
}, { modelName: 'SimpleWithRelationAndJson' });
