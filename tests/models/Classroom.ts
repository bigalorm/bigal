import { column, Entity, primaryColumn, table } from '../../src/index.js';

import { type Student } from './Student.js';
import { StudentClassroom } from './StudentClassroom.js';
import { type Teacher } from './Teacher.js';
import { TeacherClassroom } from './TeacherClassroom.js';

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
