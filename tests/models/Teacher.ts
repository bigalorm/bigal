import { belongsTo, booleanColumn, hasMany, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';
import { tables } from './index.js';

export const teacherSchema = {
  ...stringIdBase,
  firstName: text().notNull(),
  lastName: text().notNull(),
  parkingSpace: belongsTo<string>(() => tables.ParkingSpace!),
  classrooms: hasMany(() => tables.Classroom!)
    .through(() => tables.TeacherClassroom!)
    .via('teacher'),
  isActive: booleanColumn().default(true),
};

export type TeacherSelect = InferSelect<typeof teacherSchema>;
export type TeacherInsert = InferInsert<typeof teacherSchema>;
