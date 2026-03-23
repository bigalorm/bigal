import { belongsTo, table } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';

export const TeacherClassroom = table('teacher__classroom', {
  ...stringIdBase,
  teacher: belongsTo<string>('Teacher'),
  classroom: belongsTo<string>('Classroom'),
});
