import { column, Entity, primaryColumn, table } from '../../src/index.js';

import { Classroom } from './Classroom.js';
import { StudentClassroom } from './StudentClassroom.js';

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
