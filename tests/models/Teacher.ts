import { belongsTo, booleanColumn, hasMany, table, text } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';

export const Teacher = table('teacher', {
  ...stringIdBase,
  firstName: text().notNull(),
  lastName: text().notNull(),
  parkingSpace: belongsTo<string>('ParkingSpace'),
  classrooms: hasMany('Classroom').through('TeacherClassroom').via('teacher'),
  isActive: booleanColumn().default(true),
});
