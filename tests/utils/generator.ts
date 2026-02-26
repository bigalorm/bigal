import { faker } from '@faker-js/faker';

import { type NotEntity, type QueryResult } from '../../src/index.js';
import { type IJsonLikeEntity, type ProductCategory, type SimpleWithRelationAndJson, type TeacherClassroom } from '../models/index.js';
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
  SimpleWithOptionalEnum,
  SimpleWithSelfReference,
  SimpleWithStringCollection,
  SimpleWithStringId,
  SimpleWithUnion,
  Store,
  Teacher,
} from '../models/index.js';

export function store(args?: Partial<QueryResult<Store>>): QueryResult<Store> {
  const item = new Store();
  item.id = faker.number.int();
  item.name = `Store - ${faker.string.uuid()}`;

  return Object.assign(item, args);
}

export function product(args: Partial<QueryResult<Product>> & Pick<QueryResult<Product>, 'store'>): QueryResult<Product> {
  const item = new Product();
  item.id = faker.number.int();
  item.name = `Product - ${faker.string.uuid()}`;

  return Object.assign(item, args);
}

export function category(args?: Partial<QueryResult<Category>>): QueryResult<Category> {
  const item = new Category();
  item.id = faker.number.int();
  item.name = `Category - ${faker.string.uuid()}`;

  return Object.assign(item, args);
}

export function productCategory(productInput: Pick<QueryResult<Product>, 'id'> | number, categoryInput: Pick<QueryResult<Category>, 'id'> | number): QueryResult<ProductCategory> {
  return {
    id: faker.number.int(),
    product: (productInput as QueryResult<Product>).id || (productInput as number),
    category: (categoryInput as QueryResult<Category>).id || (categoryInput as number),
  };
}

export function teacher(args?: Partial<QueryResult<Teacher>>): QueryResult<Teacher> {
  const item = new Teacher();
  item.id = `Teacher - ${faker.string.uuid()}`;
  item.firstName = faker.person.firstName();
  item.lastName = faker.person.lastName();
  item.isActive = true;

  return Object.assign(item, args);
}

export function classroom(args?: Partial<QueryResult<Classroom>>): QueryResult<Classroom> {
  const item = new Classroom();
  item.id = `Classroom - ${faker.string.uuid()}`;
  item.name = `Classroom - ${faker.string.uuid()}`;

  return Object.assign(item, args);
}

export function teacherClassroom(teacherInput: Pick<QueryResult<Teacher>, 'id'> | string, classroomInput: Pick<QueryResult<Classroom>, 'id'> | string): QueryResult<TeacherClassroom> {
  return {
    id: `TeacherClassroom - ${faker.string.uuid()}`,
    teacher: (teacherInput as QueryResult<Teacher>).id || (teacherInput as string),
    classroom: (classroomInput as QueryResult<Classroom>).id || (classroomInput as string),
  };
}

export function parkingLot(args?: Partial<QueryResult<ParkingLot>>): QueryResult<ParkingLot> {
  const item = new ParkingLot();
  item.id = `ParkingLot - ${faker.string.uuid()}`;
  item.name = `ParkingLot - ${faker.string.uuid()}`;

  return Object.assign(item, args);
}

export function parkingSpace(args: Partial<QueryResult<ParkingSpace>> & Pick<QueryResult<ParkingSpace>, 'parkingLot'>): QueryResult<ParkingSpace> {
  const item = new ParkingSpace();
  item.id = `ParkingSpace - ${faker.string.uuid()}`;
  item.name = `ParkingSpace - ${faker.string.uuid()}`;

  return Object.assign(item, args);
}

export function levelOne(args: Partial<QueryResult<LevelOne>> & Pick<QueryResult<LevelOne>, 'levelTwo'>): QueryResult<LevelOne> {
  const item = new LevelOne();
  item.id = `LevelOne - ${faker.string.uuid()}`;
  item.one = `One - ${faker.string.uuid()}`;

  return Object.assign(item, args);
}

export function levelTwo(args: Partial<QueryResult<LevelTwo>> & Pick<QueryResult<LevelTwo>, 'levelThree'>): QueryResult<LevelTwo> {
  const item = new LevelTwo();
  item.id = `LevelTwo - ${faker.string.uuid()}`;
  item.two = `Two - ${faker.string.uuid()}`;

  return Object.assign(item, args);
}

export function levelThree(args?: Partial<QueryResult<LevelThree>>): QueryResult<LevelThree> {
  const item = new LevelThree();
  item.id = `LevelThree - ${faker.string.uuid()}`;
  item.three = `Three - ${faker.string.uuid()}`;

  return Object.assign(item, args);
}

export function simpleWithSelfReference(args?: Partial<QueryResult<SimpleWithSelfReference>>): QueryResult<SimpleWithSelfReference> {
  const item = new SimpleWithSelfReference();
  item.id = `SimpleWithSelfReference - ${faker.string.uuid()}`;
  item.name = `WithSelfReference - ${faker.string.uuid()}`;

  return Object.assign(item, args);
}

export function simpleWithStringId(args?: Partial<QueryResult<SimpleWithStringId>>): QueryResult<SimpleWithStringId> {
  const item = new SimpleWithStringId();
  item.id = `SimpleWithStringId - ${faker.string.uuid()}`;
  item.name = `WithStringId - ${faker.string.uuid()}`;

  return Object.assign(item, args);
}

export function simpleWithStringCollection(args?: Partial<QueryResult<SimpleWithStringCollection>>): QueryResult<SimpleWithStringCollection> {
  const item = new SimpleWithStringCollection();
  item.id = faker.number.int();
  item.name = `WithStringCollection - ${faker.string.uuid()}`;
  item.otherIds = [faker.string.uuid(), faker.string.uuid()];

  return Object.assign(item, args);
}

export function simpleWithUnion(args?: Partial<QueryResult<SimpleWithUnion>>): QueryResult<SimpleWithUnion> {
  const item = new SimpleWithUnion();
  item.id = faker.number.int();
  item.name = `WithUnion - ${faker.string.uuid()}`;
  item.status = 'Foobar';

  return Object.assign(item, args);
}

export function simpleWithOptionalEnum(args?: Partial<QueryResult<SimpleWithOptionalEnum>>): QueryResult<SimpleWithOptionalEnum> {
  const item = new SimpleWithOptionalEnum();
  item.id = faker.number.int();
  item.name = `WithEnum - ${faker.string.uuid()}`;
  item.status = 'Foobar';

  return Object.assign(item, args);
}

export function simpleWithJson(args?: Partial<QueryResult<SimpleWithJson>>): QueryResult<SimpleWithJson> {
  const item = new SimpleWithJson();
  item.id = faker.number.int();
  item.name = `WithJson - ${faker.string.uuid()}`;
  item.keyValue = {
    foo: 42,
  };

  return Object.assign(item, args);
}

export function simpleWithRelationAndJson(
  args: Partial<QueryResult<SimpleWithRelationAndJson>> & Pick<QueryResult<SimpleWithRelationAndJson>, 'store'>,
): QueryResult<SimpleWithRelationAndJson> & Required<Pick<SimpleWithRelationAndJson, 'message'>> {
  return {
    id: faker.number.int(),
    name: `WithRelationAndJson - ${faker.string.uuid()}`,
    message: {
      id: 'foo',
      message: 'bar',
    } as NotEntity<IJsonLikeEntity>,
    ...args,
  };
}
