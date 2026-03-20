import { hasMany, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { stringIdBase, tables } from './index.js';

export const studentSchema = {
  ...stringIdBase,
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  classrooms: hasMany(() => tables.Classroom!)
    .through(() => tables.StudentClassroom!)
    .via('student'),
};

export type StudentSelect = InferSelect<typeof studentSchema>;
export type StudentInsert = InferInsert<typeof studentSchema>;
