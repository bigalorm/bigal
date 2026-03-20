import { belongsTo } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { stringIdBase, tables } from './index.js';

export const studentClassroomSchema = {
  ...stringIdBase,
  student: belongsTo<string>(() => tables.Student!, 'student_id'),
  category: belongsTo<string>(() => tables.Classroom!, 'classroom_id'),
};

export type StudentClassroomSelect = InferSelect<typeof studentClassroomSchema>;
export type StudentClassroomInsert = InferInsert<typeof studentClassroomSchema>;
