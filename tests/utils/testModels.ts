import { faker } from '@faker-js/faker';

import type { InferSelect } from '../../src/schema/index.js';
import {
  Category,
  Classroom,
  ImportedItem,
  KitchenSink,
  LevelOne,
  LevelThree,
  LevelTwo,
  ParkingLot,
  ParkingSpace,
  Product,
  ProductCategory,
  ProductWithCreatedAt,
  ProductWithCreateUpdateDateTracking,
  ReadonlyProduct,
  RequiredPropertyWithDefaultValue,
  RequiredPropertyWithDefaultValueFunction,
  SimpleWithCollections,
  SimpleWithCreatedAt,
  SimpleWithCreatedAtAndUpdatedAt,
  SimpleWithJson,
  SimpleWithOptionalEnum,
  SimpleWithRelationAndJson,
  SimpleWithSchema,
  SimpleWithSelfReference,
  SimpleWithStringCollection,
  SimpleWithStringId,
  SimpleWithUUID,
  SimpleWithUnion,
  SimpleWithUpdatedAt,
  SimpleWithVersion,
  Store,
  Student,
  StudentClassroom,
  Teacher,
  TeacherClassroom,
} from '../models/index.js';

// ---------------------------------------------------------------------------
// Select types derived from table definitions
// ---------------------------------------------------------------------------

export type CategorySelect = InferSelect<(typeof Category)['schema']>;
export type ClassroomSelect = InferSelect<(typeof Classroom)['schema']>;
export type KitchenSinkSelect = InferSelect<(typeof KitchenSink)['schema']>;
export type LevelOneSelect = InferSelect<(typeof LevelOne)['schema']>;
export type LevelTwoSelect = InferSelect<(typeof LevelTwo)['schema']>;
export type LevelThreeSelect = InferSelect<(typeof LevelThree)['schema']>;
export type ParkingLotSelect = InferSelect<(typeof ParkingLot)['schema']>;
export type ParkingSpaceSelect = InferSelect<(typeof ParkingSpace)['schema']>;
export type ProductSelect = InferSelect<(typeof Product)['schema']>;
export type ProductCategorySelect = InferSelect<(typeof ProductCategory)['schema']>;
export type ReadonlyProductSelect = InferSelect<(typeof ReadonlyProduct)['schema']>;
export type SimpleWithJsonSelect = InferSelect<(typeof SimpleWithJson)['schema']>;
export type SimpleWithOptionalEnumSelect = InferSelect<(typeof SimpleWithOptionalEnum)['schema']>;
export type SimpleWithRelationAndJsonSelect = InferSelect<(typeof SimpleWithRelationAndJson)['schema']>;
export type SimpleWithSelfReferenceSelect = InferSelect<(typeof SimpleWithSelfReference)['schema']>;
export type SimpleWithStringCollectionSelect = InferSelect<(typeof SimpleWithStringCollection)['schema']>;
export type SimpleWithStringIdSelect = InferSelect<(typeof SimpleWithStringId)['schema']>;
export type SimpleWithUnionSelect = InferSelect<(typeof SimpleWithUnion)['schema']>;
export type StoreSelect = InferSelect<(typeof Store)['schema']>;
export type TeacherSelect = InferSelect<(typeof Teacher)['schema']>;
export type TeacherClassroomSelect = InferSelect<(typeof TeacherClassroom)['schema']>;
export type ImportedItemSelect = InferSelect<(typeof ImportedItem)['schema']>;
export type ProductWithCreatedAtSelect = InferSelect<(typeof ProductWithCreatedAt)['schema']>;
export type RequiredPropertyWithDefaultValueSelect = InferSelect<(typeof RequiredPropertyWithDefaultValue)['schema']>;
export type RequiredPropertyWithDefaultValueFunctionSelect = InferSelect<(typeof RequiredPropertyWithDefaultValueFunction)['schema']>;
export type SimpleWithCollectionsSelect = InferSelect<(typeof SimpleWithCollections)['schema']>;
export type SimpleWithCreatedAtSelect = InferSelect<(typeof SimpleWithCreatedAt)['schema']>;
export type SimpleWithCreatedAtAndUpdatedAtSelect = InferSelect<(typeof SimpleWithCreatedAtAndUpdatedAt)['schema']>;
export type SimpleWithSchemaSelect = InferSelect<(typeof SimpleWithSchema)['schema']>;
export type SimpleWithUUIDSelect = InferSelect<(typeof SimpleWithUUID)['schema']>;
export type SimpleWithUpdatedAtSelect = InferSelect<(typeof SimpleWithUpdatedAt)['schema']>;
export type SimpleWithVersionSelect = InferSelect<(typeof SimpleWithVersion)['schema']>;

// ---------------------------------------------------------------------------
// Re-export models (used by test files)
// ---------------------------------------------------------------------------

export {
  Category as CategoryDef,
  Classroom as ClassroomDef,
  ImportedItem as ImportedItemDef,
  KitchenSink as KitchenSinkDef,
  LevelOne as LevelOneDef,
  LevelTwo as LevelTwoDef,
  LevelThree as LevelThreeDef,
  ParkingLot as ParkingLotDef,
  ParkingSpace as ParkingSpaceDef,
  Product as ProductDef,
  ProductCategory as ProductCategoryDef,
  ProductWithCreatedAt as ProductWithCreatedAtDef,
  ProductWithCreateUpdateDateTracking as ProductWithCreateUpdateDateTrackingDef,
  ReadonlyProduct as ReadonlyProductDef,
  RequiredPropertyWithDefaultValue as RequiredPropertyWithDefaultValueDef,
  RequiredPropertyWithDefaultValueFunction as RequiredPropertyWithDefaultValueFunctionDef,
  SimpleWithCollections as SimpleWithCollectionsDef,
  SimpleWithCreatedAt as SimpleWithCreatedAtDef,
  SimpleWithCreatedAtAndUpdatedAt as SimpleWithCreatedAtAndUpdatedAtDef,
  SimpleWithJson as SimpleWithJsonDef,
  SimpleWithOptionalEnum as SimpleWithOptionalEnumDef,
  SimpleWithRelationAndJson as SimpleWithRelationAndJsonDef,
  SimpleWithSchema as SimpleWithSchemaDef,
  SimpleWithSelfReference as SimpleWithSelfReferenceDef,
  SimpleWithStringCollection as SimpleWithStringCollectionDef,
  SimpleWithStringId as SimpleWithStringIdDef,
  SimpleWithUUID as SimpleWithUUIDDef,
  SimpleWithUnion as SimpleWithUnionDef,
  SimpleWithUpdatedAt as SimpleWithUpdatedAtDef,
  SimpleWithVersion as SimpleWithVersionDef,
  Store as StoreDef,
  Student as StudentDef,
  StudentClassroom as StudentClassroomDef,
  Teacher as TeacherDef,
  TeacherClassroom as TeacherClassroomDef,
};

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
