import { faker } from '@faker-js/faker';

import type {
  CategorySelect,
  ClassroomSelect,
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

// ---------------------------------------------------------------------------
// Re-export table definitions with Def suffix
// ---------------------------------------------------------------------------

export { Category as CategoryDef } from '../models/index.js';
export { Classroom as ClassroomDef } from '../models/index.js';
export { ImportedItem as ImportedItemDef } from '../models/index.js';
export { KitchenSink as KitchenSinkDef } from '../models/index.js';
export { LevelOne as LevelOneDef } from '../models/index.js';
export { LevelTwo as LevelTwoDef } from '../models/index.js';
export { LevelThree as LevelThreeDef } from '../models/index.js';
export { ParkingLot as ParkingLotDef } from '../models/index.js';
export { ParkingSpace as ParkingSpaceDef } from '../models/index.js';
export { Product as ProductDef } from '../models/index.js';
export { ProductCategory as ProductCategoryDef } from '../models/index.js';
export { ProductWithCreatedAt as ProductWithCreatedAtDef } from '../models/index.js';
export { ProductWithLifecycleMethods as ProductWithHooksDef } from '../models/index.js';
export { ReadonlyProduct as ReadonlyProductDef } from '../models/index.js';
export { RequiredPropertyWithDefaultValue as RequiredPropertyWithDefaultValueDef } from '../models/index.js';
export { RequiredPropertyWithDefaultValueFunction as RequiredPropertyWithDefaultValueFunctionDef } from '../models/index.js';
export { SimpleWithCollections as SimpleWithCollectionsDef } from '../models/index.js';
export { SimpleWithCreatedAt as SimpleWithCreatedAtDef } from '../models/index.js';
export { SimpleWithCreatedAtAndUpdatedAt as SimpleWithCreatedAtAndUpdatedAtDef } from '../models/index.js';
export { SimpleWithJson as SimpleWithJsonDef } from '../models/index.js';
export { SimpleWithOptionalEnum as SimpleWithOptionalEnumDef } from '../models/index.js';
export { SimpleWithRelationAndJson as SimpleWithRelationAndJsonDef } from '../models/index.js';
export { SimpleWithSchema as SimpleWithSchemaDef } from '../models/index.js';
export { SimpleWithSelfReference as SimpleWithSelfReferenceDef } from '../models/index.js';
export { SimpleWithStringCollection as SimpleWithStringCollectionDef } from '../models/index.js';
export { SimpleWithStringId as SimpleWithStringIdDef } from '../models/index.js';
export { SimpleWithUnion as SimpleWithUnionDef } from '../models/index.js';
export { SimpleWithUpdatedAt as SimpleWithUpdatedAtDef } from '../models/index.js';
export { SimpleWithUUID as SimpleWithUUIDDef } from '../models/index.js';
export { SimpleWithVersion as SimpleWithVersionDef } from '../models/index.js';
export { Store as StoreDef } from '../models/index.js';
export { Student as StudentDef } from '../models/index.js';
export { StudentClassroom as StudentClassroomDef } from '../models/index.js';
export { Teacher as TeacherDef } from '../models/index.js';
export { TeacherClassroom as TeacherClassroomDef } from '../models/index.js';

// ---------------------------------------------------------------------------
// Re-export select/insert types
// ---------------------------------------------------------------------------

export type {
  CategoryInsert,
  CategorySelect,
  ClassroomInsert,
  ClassroomSelect,
  ImportedItemInsert,
  ImportedItemSelect,
  KitchenSinkInsert,
  KitchenSinkSelect,
  LevelOneInsert,
  LevelOneSelect,
  LevelThreeInsert,
  LevelThreeSelect,
  LevelTwoInsert,
  LevelTwoSelect,
  ParkingLotInsert,
  ParkingLotSelect,
  ParkingSpaceInsert,
  ParkingSpaceSelect,
  ProductCategoryInsert,
  ProductCategorySelect,
  ProductInsert,
  ProductSelect,
  ProductWithCreatedAtInsert,
  ProductWithCreatedAtSelect,
  ReadonlyProductSelect,
  RequiredPropertyWithDefaultValueFunctionInsert,
  RequiredPropertyWithDefaultValueFunctionSelect,
  RequiredPropertyWithDefaultValueInsert,
  RequiredPropertyWithDefaultValueSelect,
  SimpleWithCollectionsInsert,
  SimpleWithCollectionsSelect,
  SimpleWithCreatedAtAndUpdatedAtInsert,
  SimpleWithCreatedAtAndUpdatedAtSelect,
  SimpleWithCreatedAtInsert,
  SimpleWithCreatedAtSelect,
  SimpleWithJsonInsert,
  SimpleWithJsonSelect,
  SimpleWithOptionalEnumInsert,
  SimpleWithOptionalEnumSelect,
  SimpleWithRelationAndJsonInsert,
  SimpleWithRelationAndJsonSelect,
  SimpleWithSchemaInsert,
  SimpleWithSchemaSelect,
  SimpleWithSelfReferenceInsert,
  SimpleWithSelfReferenceSelect,
  SimpleWithStringCollectionInsert,
  SimpleWithStringCollectionSelect,
  SimpleWithStringIdInsert,
  SimpleWithStringIdSelect,
  SimpleWithUnionInsert,
  SimpleWithUnionSelect,
  SimpleWithUpdatedAtInsert,
  SimpleWithUpdatedAtSelect,
  SimpleWithUUIDInsert,
  SimpleWithUUIDSelect,
  SimpleWithVersionInsert,
  SimpleWithVersionSelect,
  StoreInsert,
  StoreSelect,
  StudentClassroomInsert,
  StudentClassroomSelect,
  StudentInsert,
  StudentSelect,
  TeacherClassroomInsert,
  TeacherClassroomSelect,
  TeacherInsert,
  TeacherSelect,
} from '../models/index.js';

// ---------------------------------------------------------------------------
// Factory functions for test data
// ---------------------------------------------------------------------------

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
    status: faker.helpers.arrayElement(['active', 'inactive']),
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
    status: faker.helpers.arrayElement(['Foo', 'Bar']),
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
