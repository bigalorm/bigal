import { column, primaryColumn, table, Entity } from '../../src';

import type { Student } from './Student';
import { StudentClassroom } from './StudentClassroom';
import type { Teacher } from './Teacher';
import { TeacherClassroom } from './TeacherClassroom';

@table({
  name: 'classroom',
})
export class Classroom extends Entity {
  @primaryColumn({ type: 'string' })
  public id!: string;

  @column({
    type: 'string',
    required: true,
  })
  public name!: string;

  @column({
    collection: () => Classroom.name,
    through: () => StudentClassroom.name,
    via: 'classroom',
  })
  public students?: Student[];

  @column({
    collection: () => Classroom.name,
    through: () => TeacherClassroom.name,
    via: 'classroom',
  })
  public teachers?: Teacher[];
}
