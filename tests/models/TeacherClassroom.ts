import { Entity, column, primaryColumn, table } from '../../src/index.js';

import { Classroom } from './Classroom.js';
import { Teacher } from './Teacher.js';

@table({
  name: 'teacher__classroom',
})
export class TeacherClassroom extends Entity {
  @primaryColumn({ type: 'string' })
  public id!: string;

  @column({
    model: () => Teacher.name,
    name: 'teacher_id',
  })
  public teacher!: Teacher | string;

  @column({
    model: () => Classroom.name,
    name: 'classroom_id',
  })
  public classroom!: Classroom | string;
}
