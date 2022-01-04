import * as faker from 'faker';

import type { NotEntity, QueryResult } from '../../src';
import type { IJsonLikeEntity, ProductCategory, SimpleWithRelationAndJson, TeacherClassroom } from '../models';
import {
  Category,
  Classroom,
  LevelOne,
  LevelThree,
  LevelTwo,
  ParkingLot,
  ParkingSpace,
  Product,
  SimpleWithJson,
  SimpleWithSelfReference,
  SimpleWithStringCollection,
  SimpleWithStringId,
  SimpleWithUnion,
  Store,
  Teacher,
} from '../models';

export function store(args?: Partial<QueryResult<Store>>): QueryResult<Store> {
  const item = new Store();
  item.id = faker.datatype.number();
  item.name = `Store - ${faker.datatype.uuid()}`;

  return Object.assign(item, args);
}

export function product(args: Partial<QueryResult<Product>> & Pick<QueryResult<Product>, 'store'>): QueryResult<Product> {
  const item = new Product();
  item.id = faker.datatype.number();
  item.name = `Product - ${faker.datatype.uuid()}`;

  return Object.assign(item, args);
}

export function category(args?: Partial<QueryResult<Category>>): QueryResult<Category> {
  const item = new Category();
  item.id = faker.datatype.number();
  item.name = `Category - ${faker.datatype.uuid()}`;

  return Object.assign(item, args);
}

export function productCategory(productInput: QueryResult<Product> | number, categoryInput: QueryResult<Category> | number): QueryResult<ProductCategory> {
  return {
    id: faker.datatype.number(),
    product: (productInput as QueryResult<Product>).id || (productInput as number),
    category: (categoryInput as QueryResult<Category>).id || (categoryInput as number),
  };
}

export function teacher(args?: Partial<QueryResult<Teacher>>): QueryResult<Teacher> {
  const item = new Teacher();
  item.id = `Teacher - ${faker.datatype.uuid()}`;
  item.firstName = faker.name.firstName();
  item.lastName = faker.name.lastName();
  item.isActive = true;

  return Object.assign(item, args);
}

export function classroom(args?: Partial<QueryResult<Classroom>>): QueryResult<Classroom> {
  const item = new Classroom();
  item.id = `Classroom - ${faker.datatype.uuid()}`;
  item.name = `Classroom - ${faker.datatype.uuid()}`;

  return Object.assign(item, args);
}

export function teacherClassroom(teacherInput: QueryResult<Teacher> | string, classroomInput: QueryResult<Classroom> | string): QueryResult<TeacherClassroom> {
  return {
    id: `TeacherClassroom - ${faker.datatype.uuid()}`,
    teacher: (teacherInput as QueryResult<Teacher>).id || (teacherInput as string),
    classroom: (classroomInput as QueryResult<Classroom>).id || (classroomInput as string),
  };
}

export function parkingLot(args?: Partial<QueryResult<ParkingLot>>): QueryResult<ParkingLot> {
  const item = new ParkingLot();
  item.id = `ParkingLot - ${faker.datatype.uuid()}`;
  item.name = `ParkingLot - ${faker.datatype.uuid()}`;

  return Object.assign(item, args);
}

export function parkingSpace(args: Partial<QueryResult<ParkingSpace>> & Pick<QueryResult<ParkingSpace>, 'parkingLot'>): QueryResult<ParkingSpace> {
  const item = new ParkingSpace();
  item.id = `ParkingSpace - ${faker.datatype.uuid()}`;
  item.name = `ParkingSpace - ${faker.datatype.uuid()}`;

  return Object.assign(item, args);
}

export function levelOne(args: Partial<QueryResult<LevelOne>> & Pick<QueryResult<LevelOne>, 'levelTwo'>): QueryResult<LevelOne> {
  const item = new LevelOne();
  item.id = `LevelOne - ${faker.datatype.uuid()}`;
  item.one = `One - ${faker.datatype.uuid()}`;

  return Object.assign(item, args);
}

export function levelTwo(args: Partial<QueryResult<LevelTwo>> & Pick<QueryResult<LevelTwo>, 'levelThree'>): QueryResult<LevelTwo> {
  const item = new LevelTwo();
  item.id = `LevelTwo - ${faker.datatype.uuid()}`;
  item.two = `Two - ${faker.datatype.uuid()}`;

  return Object.assign(item, args);
}

export function levelThree(args?: Partial<QueryResult<LevelThree>>): QueryResult<LevelThree> {
  const item = new LevelThree();
  item.id = `LevelThree - ${faker.datatype.uuid()}`;
  item.three = `Three - ${faker.datatype.uuid()}`;

  return Object.assign(item, args);
}

export function simpleWithSelfReference(args?: Partial<QueryResult<SimpleWithSelfReference>>): QueryResult<SimpleWithSelfReference> {
  const item = new SimpleWithSelfReference();
  item.id = `SimpleWithSelfReference - ${faker.datatype.uuid()}`;
  item.name = `WithSelfReference - ${faker.datatype.uuid()}`;

  return Object.assign(item, args);
}

export function simpleWithStringId(args?: Partial<QueryResult<SimpleWithStringId>>): QueryResult<SimpleWithStringId> {
  const item = new SimpleWithStringId();
  item.id = `SimpleWithStringId - ${faker.datatype.uuid()}`;
  item.name = `WithStringId - ${faker.datatype.uuid()}`;

  return Object.assign(item, args);
}

export function simpleWithStringCollection(args?: Partial<QueryResult<SimpleWithStringCollection>>): QueryResult<SimpleWithStringCollection> {
  const item = new SimpleWithStringCollection();
  item.id = faker.datatype.number();
  item.name = `WithStringCollection - ${faker.datatype.uuid()}`;
  item.otherIds = [faker.datatype.uuid(), faker.datatype.uuid()];

  return Object.assign(item, args);
}

export function simpleWithUnion(args?: Partial<QueryResult<SimpleWithUnion>>): QueryResult<SimpleWithUnion> {
  const item = new SimpleWithUnion();
  item.id = faker.datatype.number();
  item.name = `WithUnion - ${faker.datatype.uuid()}`;
  item.status = 'Foobar';

  return Object.assign(item, args);
}

export function simpleWithJson(args?: Partial<QueryResult<SimpleWithJson>>): QueryResult<SimpleWithJson> {
  const item = new SimpleWithJson();
  item.id = faker.datatype.number();
  item.name = `WithJson - ${faker.datatype.uuid()}`;
  item.keyValue = {
    foo: 42,
  };

  return Object.assign(item, args);
}

export function simpleWithRelationAndJson(
  args: Partial<QueryResult<SimpleWithRelationAndJson>> & Pick<QueryResult<SimpleWithRelationAndJson>, 'store'>,
): QueryResult<SimpleWithRelationAndJson> & Required<Pick<SimpleWithRelationAndJson, 'message'>> {
  return {
    id: faker.datatype.number(),
    name: `WithRelationAndJson - ${faker.datatype.uuid()}`,
    message: {
      id: 'foo',
      message: 'bar',
    } as NotEntity<IJsonLikeEntity>,
    ...args,
  };
}
