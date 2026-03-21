import { hasMany, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';
import { tables } from './index.js';

export const classroomSchema = {
  ...stringIdBase,
  name: text().notNull(),
  students: hasMany(() => tables.Classroom!)
    .through(() => tables.StudentClassroom!)
    .via('classroom'),
  teachers: hasMany(() => tables.Classroom!)
    .through(() => tables.TeacherClassroom!)
    .via('classroom'),
};

export type ClassroomSelect = InferSelect<typeof classroomSchema>;
export type ClassroomInsert = InferInsert<typeof classroomSchema>;
