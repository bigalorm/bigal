import { hasMany, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';
import { tables } from './index.js';

export const studentSchema = {
  ...stringIdBase,
  firstName: text().notNull(),
  lastName: text().notNull(),
  classrooms: hasMany(() => tables.Classroom!)
    .through(() => tables.StudentClassroom!)
    .via('student'),
};

export type StudentSelect = InferSelect<typeof studentSchema>;
export type StudentInsert = InferInsert<typeof studentSchema>;
