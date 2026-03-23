import { hasMany, table, text } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';

export const Student = table('student', {
  ...stringIdBase,
  firstName: text().notNull(),
  lastName: text().notNull(),
  classrooms: hasMany('Classroom').through('StudentClassroom').via('student'),
});
