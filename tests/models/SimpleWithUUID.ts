import { table, text, uuid } from '../../src/schema/index.js';

export const SimpleWithUUID = table(
  'simple_with_uuid',
  {
    id: uuid().primaryKey(),
    name: text().notNull(),
  },
  { modelName: 'SimpleWithUUID' },
);
