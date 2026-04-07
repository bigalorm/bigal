import { faker } from '@faker-js/faker';

import type {
  CategorySelect,
  ClassroomSelect,
  KitchenSinkSelect,
  LevelOneSelect,
  LevelThreeSelect,
  LevelTwoSelect,
  ParkingLotSelect,
  ParkingSpaceSelect,
  ProductCategorySelect,
  ProductSelect,
  SimpleWithJsonSelect,
  SimpleWithOptionalEnumSelect,
  SimpleWithRelationAndJsonSelect,
  SimpleWithSelfReferenceSelect,
  SimpleWithStringCollectionSelect,
  SimpleWithStringIdSelect,
  SimpleWithUnionSelect,
  StoreSelect,
  TeacherClassroomSelect,
  TeacherSelect,
} from '../models/index.js';

export function generateCategory(overrides: Partial<CategorySelect> = {}): CategorySelect {
  return {
    id: faker.number.int(),
    name: faker.commerce.department(),
    ...overrides,
  };
}

export function generateClassroom(overrides: Partial<ClassroomSelect> = {}): ClassroomSelect {
  return {
    id: faker.string.uuid(),
    name: faker.location.buildingNumber(),
    ...overrides,
  };
}

export function generateLevelOne(overrides: Partial<LevelOneSelect> = {}): LevelOneSelect {
  return {
    id: faker.string.uuid(),
    one: faker.lorem.word(),
    foo: faker.lorem.word(),
    levelTwo: faker.string.uuid(),
    ...overrides,
  };
}

export function generateLevelTwo(overrides: Partial<LevelTwoSelect> = {}): LevelTwoSelect {
  return {
    id: faker.string.uuid(),
    two: faker.lorem.word(),
    foo: faker.lorem.word(),
    levelThree: faker.string.uuid(),
    ...overrides,
  };
}

export function generateLevelThree(overrides: Partial<LevelThreeSelect> = {}): LevelThreeSelect {
  return {
    id: faker.string.uuid(),
    foo: faker.lorem.word(),
    three: faker.lorem.word(),
    ...overrides,
  };
}

export function generateParkingLot(overrides: Partial<ParkingLotSelect> = {}): ParkingLotSelect {
  return {
    id: faker.string.uuid(),
    name: faker.location.street(),
    ...overrides,
  };
}

export function generateParkingSpace(overrides: Partial<ParkingSpaceSelect> = {}): ParkingSpaceSelect {
  return {
    id: faker.string.uuid(),
    parkingLot: faker.string.uuid(),
    name: faker.string.alphanumeric(5),
    ...overrides,
  };
}

export function generateProduct(overrides: Partial<ProductSelect> = {}): ProductSelect {
  return {
    id: faker.number.int(),
    name: faker.commerce.productName(),
    sku: faker.string.alphanumeric(10),
    location: faker.location.city(),
    aliases: [faker.commerce.productName()],
    store: faker.number.int(),
    ...overrides,
  };
}

export function generateProductCategory(productInput: { id: number } | number, categoryInput: { id: number } | number): ProductCategorySelect {
  return {
    id: faker.number.int(),
    product: typeof productInput === 'number' ? productInput : productInput.id,
    category: typeof categoryInput === 'number' ? categoryInput : categoryInput.id,
    ordering: null,
    isPrimary: null,
  };
}

export function generateKitchenSink(overrides: Partial<KitchenSinkSelect> = {}): KitchenSinkSelect {
  return {
    id: faker.number.int(),
    name: faker.lorem.word(),
    intColumn: faker.number.int(),
    floatColumn: null,
    arrayColumn: null,
    stringArrayColumn: null,
    ...overrides,
  };
}

export function generateSimpleWithJson(overrides: Partial<SimpleWithJsonSelect> = {}): SimpleWithJsonSelect {
  return {
    id: faker.number.int(),
    name: faker.lorem.word(),
    bar: { [faker.lorem.word()]: faker.lorem.word() },
    keyValue: { [faker.lorem.word()]: faker.number.int() },
    ...overrides,
  };
}

export function generateSimpleWithOptionalEnum(overrides: Partial<SimpleWithOptionalEnumSelect> = {}): SimpleWithOptionalEnumSelect {
  return {
    id: faker.number.int(),
    name: faker.lorem.word(),
    status: faker.helpers.arrayElement(['active', 'inactive'] as const),
    ...overrides,
  };
}

export function generateSimpleWithRelationAndJson(overrides: Partial<SimpleWithRelationAndJsonSelect> = {}): SimpleWithRelationAndJsonSelect {
  return {
    id: faker.number.int(),
    name: faker.lorem.word(),
    store: faker.number.int(),
    message: { id: faker.string.uuid(), message: faker.lorem.sentence() },
    ...overrides,
  };
}

export function generateSimpleWithSelfReference(overrides: Partial<SimpleWithSelfReferenceSelect> = {}): SimpleWithSelfReferenceSelect {
  return {
    id: faker.string.uuid(),
    name: faker.lorem.word(),
    source: faker.string.uuid(),
    ...overrides,
  };
}

export function generateSimpleWithStringCollection(overrides: Partial<SimpleWithStringCollectionSelect> = {}): SimpleWithStringCollectionSelect {
  return {
    id: faker.number.int(),
    name: faker.lorem.word(),
    otherIds: [faker.string.uuid()],
    ...overrides,
  };
}

export function generateSimpleWithStringId(overrides: Partial<SimpleWithStringIdSelect> = {}): SimpleWithStringIdSelect {
  return {
    id: faker.string.uuid(),
    name: faker.lorem.word(),
    otherId: faker.string.uuid(),
    ...overrides,
  };
}

export function generateSimpleWithUnion(overrides: Partial<SimpleWithUnionSelect> = {}): SimpleWithUnionSelect {
  return {
    id: faker.number.int(),
    name: faker.lorem.word(),
    status: faker.helpers.arrayElement(['Foo', 'Bar', 'Foobar'] as const),
    ...overrides,
  };
}

export function generateStore(overrides: Partial<StoreSelect> = {}): StoreSelect {
  return {
    id: faker.number.int(),
    name: faker.company.name(),
    ...overrides,
  };
}

export function generateTeacher(overrides: Partial<TeacherSelect> = {}): TeacherSelect {
  return {
    id: faker.string.uuid(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    parkingSpace: faker.string.uuid(),
    isActive: faker.datatype.boolean(),
    ...overrides,
  };
}

export function generateTeacherClassroom(teacherInput: { id: string } | string, classroomInput: { id: string } | string): TeacherClassroomSelect {
  return {
    id: faker.string.uuid(),
    teacher: typeof teacherInput === 'string' ? teacherInput : teacherInput.id,
    classroom: typeof classroomInput === 'string' ? classroomInput : classroomInput.id,
  };
}
