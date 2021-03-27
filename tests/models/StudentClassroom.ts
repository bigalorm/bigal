import { Entity, column, primaryColumn, table } from '../../src';

// eslint-disable-next-line import/no-cycle
import { Classroom } from './Classroom';
// eslint-disable-next-line import/no-cycle
import { Student } from './Student';

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
