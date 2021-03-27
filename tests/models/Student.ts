import { column, primaryColumn, table, Entity } from '../../src';

import { Classroom } from './Classroom';
import { StudentClassroom } from './StudentClassroom';

@table({
  name: 'student',
})
export class Student extends Entity {
  @primaryColumn({ type: 'string' })
  public id!: string;

  @column({
    type: 'string',
    required: true,
  })
  public firstName!: string;

  @column({
    type: 'string',
    required: true,
  })
  public lastName!: string;

  @column({
    collection: () => Classroom.name,
    through: () => StudentClassroom.name,
    via: 'student',
  })
  public classrooms?: Classroom[];
}
