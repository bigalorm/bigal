import { belongsTo } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';
import { tables } from './index.js';

export const teacherClassroomSchema = {
  ...stringIdBase,
  teacher: belongsTo<string>(() => tables.Teacher!),
  classroom: belongsTo<string>(() => tables.Classroom!),
};

export type TeacherClassroomSelect = InferSelect<typeof teacherClassroomSchema>;
export type TeacherClassroomInsert = InferInsert<typeof teacherClassroomSchema>;
