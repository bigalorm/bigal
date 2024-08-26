import { column, Entity, primaryColumn, table } from '../../src/index.js';

import { Classroom } from './Classroom.js';
import { ParkingSpace } from './ParkingSpace.js';
import { TeacherClassroom } from './TeacherClassroom.js';

@table({
  name: 'teacher',
})
export class Teacher extends Entity {
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
    model: () => ParkingSpace.name,
    name: 'parking_space_id',
  })
  public parkingSpace?: ParkingSpace | string;

  @column({
    collection: () => Classroom.name,
    through: () => TeacherClassroom.name,
    via: 'teacher',
  })
  public classrooms?: Classroom[];

  @column({
    defaultsTo: true,
    type: 'boolean',
    name: 'is_active',
  })
  public isActive!: boolean;
}
