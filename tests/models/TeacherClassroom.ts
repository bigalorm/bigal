import { belongsTo } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';

export const teacherClassroomSchema = {
  ...stringIdBase,
  teacher: belongsTo<string>('Teacher'),
  classroom: belongsTo<string>('Classroom'),
};

export type TeacherClassroomSelect = InferSelect<typeof teacherClassroomSchema>;
export type TeacherClassroomInsert = InferInsert<typeof teacherClassroomSchema>;
