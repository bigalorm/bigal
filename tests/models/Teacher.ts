import { belongsTo, booleanColumn, hasMany, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';

export const teacherSchema = {
  ...stringIdBase,
  firstName: text().notNull(),
  lastName: text().notNull(),
  parkingSpace: belongsTo<string>('ParkingSpace'),
  classrooms: hasMany('Classroom').through('TeacherClassroom').via('teacher'),
  isActive: booleanColumn().default(true),
};

export type TeacherSelect = InferSelect<typeof teacherSchema>;
export type TeacherInsert = InferInsert<typeof teacherSchema>;
