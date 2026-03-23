import { hasMany, table, text } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';

export const Classroom = table('classroom', {
  ...stringIdBase,
  name: text().notNull(),
  students: hasMany('Classroom').through('StudentClassroom').via('classroom'),
  teachers: hasMany('Classroom').through('TeacherClassroom').via('classroom'),
});
