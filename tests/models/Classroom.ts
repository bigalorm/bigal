import { hasMany, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';

export const classroomSchema = {
  ...stringIdBase,
  name: text().notNull(),
  students: hasMany('Classroom').through('StudentClassroom').via('classroom'),
  teachers: hasMany('Classroom').through('TeacherClassroom').via('classroom'),
};

export type ClassroomSelect = InferSelect<typeof classroomSchema>;
export type ClassroomInsert = InferInsert<typeof classroomSchema>;
