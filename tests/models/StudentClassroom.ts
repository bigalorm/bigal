import { belongsTo, table } from '../../src/schema/index.js';

import { stringIdBase } from './base.js';

export const StudentClassroom = table('student__classroom', {
  ...stringIdBase,
  student: belongsTo<string>('Student'),
  category: belongsTo<string>('Classroom', 'classroom_id'),
});
