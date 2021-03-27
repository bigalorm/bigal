import { Entity, column, primaryColumn, table } from '../../src';

// eslint-disable-next-line import/no-cycle
import { Classroom } from './Classroom';
// eslint-disable-next-line import/no-cycle
import { Teacher } from './Teacher';

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
