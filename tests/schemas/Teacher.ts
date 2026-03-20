import { belongsTo, booleanColumn, hasMany, text } from '../../src/schema/index.js';
import type { InferInsert, InferSelect } from '../../src/schema/index.js';

import { stringIdBase, tables } from './index.js';

export const teacherSchema = {
  ...stringIdBase,
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  parkingSpace: belongsTo<string>(() => tables.ParkingSpace!, 'parking_space_id'),
  classrooms: hasMany(() => tables.Classroom!)
    .through(() => tables.TeacherClassroom!)
    .via('teacher'),
  isActive: booleanColumn('is_active').default(true),
};

export type TeacherSelect = InferSelect<typeof teacherSchema>;
export type TeacherInsert = InferInsert<typeof teacherSchema>;
