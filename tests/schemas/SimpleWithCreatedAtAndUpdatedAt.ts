import { updatedAt } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { simpleWithCreatedAtSchema } from './SimpleWithCreatedAt.js';

export const simpleWithCreatedAtAndUpdatedAtSchema = {
  ...simpleWithCreatedAtSchema,
  updatedAt: updatedAt(),
};

export type SimpleWithCreatedAtAndUpdatedAtSelect = InferSelect<typeof simpleWithCreatedAtAndUpdatedAtSchema>;
export type SimpleWithCreatedAtAndUpdatedAtInsert = InferInsert<typeof simpleWithCreatedAtAndUpdatedAtSchema>;
