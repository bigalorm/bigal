import { text, uuid } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

export const simpleWithUUIDSchema = {
  id: uuid().primaryKey(),
  name: text().notNull(),
};

export type SimpleWithUUIDSelect = InferSelect<typeof simpleWithUUIDSchema>;
export type SimpleWithUUIDInsert = InferInsert<typeof simpleWithUUIDSchema>;
