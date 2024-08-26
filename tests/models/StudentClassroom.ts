import { column, Entity, primaryColumn, table } from '../../src/index.js';

import { Classroom } from './Classroom.js';
import { Student } from './Student.js';

@table({
  name: 'student__classroom',
})
export class StudentClassroom extends Entity {
  @primaryColumn({ type: 'string' })
  public id!: string;

  @column({
    model: () => Student.name,
    name: 'student_id',
  })
  public student!: Student | string;

  @column({
    model: () => Classroom.name,
    name: 'classroom_id',
  })
  public category!: Classroom | string;
}
