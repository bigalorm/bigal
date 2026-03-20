import { createdAt, serial, table, text, updatedAt } from '../../src/schema/index.js';
import type { TableDefinition } from '../../src/schema/index.js';

import { categorySchema } from './Category.js';
import { classroomSchema } from './Classroom.js';
import { importedItemSchema } from './ImportedItem.js';
import { kitchenSinkSchema } from './KitchenSink.js';
import { levelOneSchema } from './LevelOne.js';
import { levelThreeSchema } from './LevelThree.js';
import { levelTwoSchema } from './LevelTwo.js';
import { parkingLotSchema } from './ParkingLot.js';
import { parkingSpaceSchema } from './ParkingSpace.js';
import { productSchema } from './Product.js';
import { productCategorySchema } from './ProductCategory.js';
import { productWithCreatedAtSchema } from './ProductWithCreatedAt.js';
import { productWithCreateUpdateDateTrackingSchema } from './ProductWithCreateUpdateDateTracking.js';
import { productWithLifecycleMethodsSchema } from './ProductWithLifecycleMethods.js';
import { readonlyProductSchema } from './ReadonlyProduct.js';
import { requiredPropertyWithDefaultValueSchema } from './RequiredPropertyWithDefaultValue.js';
import { requiredPropertyWithDefaultValueFunctionSchema } from './RequiredPropertyWithDefaultValueFunction.js';
import { simpleWithCollectionsSchema } from './SimpleWithCollections.js';
import { simpleWithCreatedAtSchema } from './SimpleWithCreatedAt.js';
import { simpleWithCreatedAtAndUpdatedAtSchema } from './SimpleWithCreatedAtAndUpdatedAt.js';
import { simpleWithJsonSchema } from './SimpleWithJson.js';
import { simpleWithOptionalEnumSchema } from './SimpleWithOptionalEnum.js';
import { simpleWithRelationAndJsonSchema } from './SimpleWithRelationAndJson.js';
import { simpleWithSchemaSchema } from './SimpleWithSchema.js';
import { simpleWithSelfReferenceSchema } from './SimpleWithSelfReference.js';
import { simpleWithStringCollectionSchema } from './SimpleWithStringCollection.js';
import { simpleWithStringIdSchema } from './SimpleWithStringId.js';
import { simpleWithUnionSchema } from './SimpleWithUnion.js';
import { simpleWithUpdatedAtSchema } from './SimpleWithUpdatedAt.js';
import { simpleWithUUIDSchema } from './SimpleWithUUID.js';
import { simpleWithVersionSchema } from './SimpleWithVersion.js';
import { storeSchema } from './Store.js';
import { studentSchema } from './Student.js';
import { studentClassroomSchema } from './StudentClassroom.js';
import { teacherSchema } from './Teacher.js';
import { teacherClassroomSchema } from './TeacherClassroom.js';

// ---------------------------------------------------------------------------
// Shared base column definitions
// ---------------------------------------------------------------------------

export const modelBase = {
  id: serial('id').primaryKey(),
};

export const stringIdBase = {
  id: text('id').primaryKey(),
};

export const timestamps = {
  createdAt: createdAt(),
  updatedAt: updatedAt(),
};

// ---------------------------------------------------------------------------
// Tables registry for circular references
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- opaque registry to break circular type inference
export const tables: Record<string, TableDefinition<any, any>> = {};

// ---------------------------------------------------------------------------
// Table definitions
// ---------------------------------------------------------------------------

export const Category = table('categories', categorySchema);
tables.Category = Category;

export const Classroom = table('classroom', classroomSchema);
tables.Classroom = Classroom;

export const ImportedItem = table('imported_item', importedItemSchema);
tables.ImportedItem = ImportedItem;

export const KitchenSink = table('kitchen_sink', kitchenSinkSchema);
tables.KitchenSink = KitchenSink;

export const LevelOne = table('level_one', levelOneSchema);
tables.LevelOne = LevelOne;

export const LevelTwo = table('level_two', levelTwoSchema);
tables.LevelTwo = LevelTwo;

export const LevelThree = table('level_three', levelThreeSchema);
tables.LevelThree = LevelThree;

export const ParkingLot = table('parking_lot', parkingLotSchema);
tables.ParkingLot = ParkingLot;

export const ParkingSpace = table('parking_space', parkingSpaceSchema);
tables.ParkingSpace = ParkingSpace;

export const Product = table('products', productSchema);
tables.Product = Product;

export const ProductCategory = table('product__category', productCategorySchema);
tables.ProductCategory = ProductCategory;

export const ProductWithCreatedAt = table('products', productWithCreatedAtSchema);
tables.ProductWithCreatedAt = ProductWithCreatedAt;

export const ProductWithCreateUpdateDateTracking = table('products', productWithCreateUpdateDateTrackingSchema, {
  hooks: {
    async beforeCreate(values) {
      await Promise.resolve();
      return {
        ...values,
        name: `beforeCreate - ${values.name}`,
      };
    },
    beforeUpdate(values) {
      return {
        ...values,
        name: `beforeUpdate - ${values.name}`,
      };
    },
  },
});
tables.ProductWithCreateUpdateDateTracking = ProductWithCreateUpdateDateTracking;

export const ProductWithLifecycleMethods = table('products', productWithLifecycleMethodsSchema, {
  hooks: {
    beforeCreate(values) {
      return values;
    },
  },
});
tables.ProductWithLifecycleMethods = ProductWithLifecycleMethods;

export const ReadonlyProduct = table('readonly_products', readonlyProductSchema, { readonly: true });
tables.ReadonlyProduct = ReadonlyProduct;

export const RequiredPropertyWithDefaultValue = table('some_table', requiredPropertyWithDefaultValueSchema);
tables.RequiredPropertyWithDefaultValue = RequiredPropertyWithDefaultValue;

export const RequiredPropertyWithDefaultValueFunction = table('some_other_table', requiredPropertyWithDefaultValueFunctionSchema);
tables.RequiredPropertyWithDefaultValueFunction = RequiredPropertyWithDefaultValueFunction;

export const SimpleWithCollections = table('simple', simpleWithCollectionsSchema);
tables.SimpleWithCollections = SimpleWithCollections;

export const SimpleWithCreatedAt = table('simple', simpleWithCreatedAtSchema);
tables.SimpleWithCreatedAt = SimpleWithCreatedAt;

export const SimpleWithCreatedAtAndUpdatedAt = table('simple', simpleWithCreatedAtAndUpdatedAtSchema);
tables.SimpleWithCreatedAtAndUpdatedAt = SimpleWithCreatedAtAndUpdatedAt;

export const SimpleWithJson = table('simple', simpleWithJsonSchema);
tables.SimpleWithJson = SimpleWithJson;

export const SimpleWithOptionalEnum = table('simple', simpleWithOptionalEnumSchema);
tables.SimpleWithOptionalEnum = SimpleWithOptionalEnum;

export const SimpleWithRelationAndJson = table('simple', simpleWithRelationAndJsonSchema);
tables.SimpleWithRelationAndJson = SimpleWithRelationAndJson;

export const SimpleWithSchema = table('simple', simpleWithSchemaSchema, { schema: 'foo' });
tables.SimpleWithSchema = SimpleWithSchema;

export const SimpleWithSelfReference = table('simple', simpleWithSelfReferenceSchema);
tables.SimpleWithSelfReference = SimpleWithSelfReference;

export const SimpleWithStringCollection = table('simple', simpleWithStringCollectionSchema);
tables.SimpleWithStringCollection = SimpleWithStringCollection;

export const SimpleWithStringId = table('simple', simpleWithStringIdSchema);
tables.SimpleWithStringId = SimpleWithStringId;

export const SimpleWithUnion = table('simple', simpleWithUnionSchema);
tables.SimpleWithUnion = SimpleWithUnion;

export const SimpleWithUpdatedAt = table('simple', simpleWithUpdatedAtSchema);
tables.SimpleWithUpdatedAt = SimpleWithUpdatedAt;

export const SimpleWithUUID = table('simple_with_uuid', simpleWithUUIDSchema);
tables.SimpleWithUUID = SimpleWithUUID;

export const SimpleWithVersion = table('simple_with_version', simpleWithVersionSchema);
tables.SimpleWithVersion = SimpleWithVersion;

export const Store = table('stores', storeSchema);
tables.Store = Store;

export const Student = table('student', studentSchema);
tables.Student = Student;

export const StudentClassroom = table('student__classroom', studentClassroomSchema);
tables.StudentClassroom = StudentClassroom;

export const Teacher = table('teacher', teacherSchema);
tables.Teacher = Teacher;

export const TeacherClassroom = table('teacher__classroom', teacherClassroomSchema);
tables.TeacherClassroom = TeacherClassroom;

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export { categorySchema } from './Category.js';
export type { CategoryInsert, CategorySelect } from './Category.js';

export { classroomSchema } from './Classroom.js';
export type { ClassroomInsert, ClassroomSelect } from './Classroom.js';

export { importedItemSchema } from './ImportedItem.js';
export type { ImportedItemInsert, ImportedItemSelect } from './ImportedItem.js';

export { kitchenSinkSchema } from './KitchenSink.js';
export type { KitchenSinkInsert, KitchenSinkSelect } from './KitchenSink.js';

export { levelOneSchema } from './LevelOne.js';
export type { LevelOneInsert, LevelOneSelect } from './LevelOne.js';

export { levelTwoSchema } from './LevelTwo.js';
export type { LevelTwoInsert, LevelTwoSelect } from './LevelTwo.js';

export { levelThreeSchema } from './LevelThree.js';
export type { LevelThreeInsert, LevelThreeSelect } from './LevelThree.js';

export { parkingLotSchema } from './ParkingLot.js';
export type { ParkingLotInsert, ParkingLotSelect } from './ParkingLot.js';

export { parkingSpaceSchema } from './ParkingSpace.js';
export type { ParkingSpaceInsert, ParkingSpaceSelect } from './ParkingSpace.js';

export { productSchema } from './Product.js';
export type { ProductInsert, ProductSelect } from './Product.js';

export { productCategorySchema } from './ProductCategory.js';
export type { ProductCategoryInsert, ProductCategorySelect } from './ProductCategory.js';

export { productWithCreatedAtSchema } from './ProductWithCreatedAt.js';
export type { ProductWithCreatedAtInsert, ProductWithCreatedAtSelect } from './ProductWithCreatedAt.js';

export { productWithCreateUpdateDateTrackingSchema } from './ProductWithCreateUpdateDateTracking.js';
export type { ProductWithCreateUpdateDateTrackingInsert, ProductWithCreateUpdateDateTrackingSelect } from './ProductWithCreateUpdateDateTracking.js';

export { productWithLifecycleMethodsSchema } from './ProductWithLifecycleMethods.js';
export type { ProductWithLifecycleMethodsInsert, ProductWithLifecycleMethodsSelect } from './ProductWithLifecycleMethods.js';

export { readonlyProductSchema } from './ReadonlyProduct.js';
export type { ReadonlyProductSelect } from './ReadonlyProduct.js';

export { requiredPropertyWithDefaultValueSchema } from './RequiredPropertyWithDefaultValue.js';
export type { RequiredPropertyWithDefaultValueInsert, RequiredPropertyWithDefaultValueSelect } from './RequiredPropertyWithDefaultValue.js';

export { requiredPropertyWithDefaultValueFunctionSchema } from './RequiredPropertyWithDefaultValueFunction.js';
export type { RequiredPropertyWithDefaultValueFunctionInsert, RequiredPropertyWithDefaultValueFunctionSelect } from './RequiredPropertyWithDefaultValueFunction.js';

export { simpleWithCollectionsSchema } from './SimpleWithCollections.js';
export type { SimpleWithCollectionsInsert, SimpleWithCollectionsSelect } from './SimpleWithCollections.js';

export { simpleWithCreatedAtSchema } from './SimpleWithCreatedAt.js';
export type { SimpleWithCreatedAtInsert, SimpleWithCreatedAtSelect } from './SimpleWithCreatedAt.js';

export { simpleWithCreatedAtAndUpdatedAtSchema } from './SimpleWithCreatedAtAndUpdatedAt.js';
export type { SimpleWithCreatedAtAndUpdatedAtInsert, SimpleWithCreatedAtAndUpdatedAtSelect } from './SimpleWithCreatedAtAndUpdatedAt.js';

export { simpleWithJsonSchema } from './SimpleWithJson.js';
export type { SimpleWithJsonInsert, SimpleWithJsonSelect } from './SimpleWithJson.js';

export { simpleWithOptionalEnumSchema } from './SimpleWithOptionalEnum.js';
export type { SimpleWithOptionalEnumInsert, SimpleWithOptionalEnumSelect } from './SimpleWithOptionalEnum.js';

export { simpleWithRelationAndJsonSchema } from './SimpleWithRelationAndJson.js';
export type { IJsonLikeEntity, SimpleWithRelationAndJsonInsert, SimpleWithRelationAndJsonSelect } from './SimpleWithRelationAndJson.js';

export { simpleWithSchemaSchema } from './SimpleWithSchema.js';
export type { SimpleWithSchemaInsert, SimpleWithSchemaSelect } from './SimpleWithSchema.js';

export { simpleWithSelfReferenceSchema } from './SimpleWithSelfReference.js';
export type { SimpleWithSelfReferenceInsert, SimpleWithSelfReferenceSelect } from './SimpleWithSelfReference.js';

export { simpleWithStringCollectionSchema } from './SimpleWithStringCollection.js';
export type { SimpleWithStringCollectionInsert, SimpleWithStringCollectionSelect } from './SimpleWithStringCollection.js';

export { simpleWithStringIdSchema } from './SimpleWithStringId.js';
export type { SimpleWithStringIdInsert, SimpleWithStringIdSelect } from './SimpleWithStringId.js';

export { simpleWithUnionSchema } from './SimpleWithUnion.js';
export type { SimpleWithUnionInsert, SimpleWithUnionSelect } from './SimpleWithUnion.js';

export { simpleWithUpdatedAtSchema } from './SimpleWithUpdatedAt.js';
export type { SimpleWithUpdatedAtInsert, SimpleWithUpdatedAtSelect } from './SimpleWithUpdatedAt.js';

export { simpleWithUUIDSchema } from './SimpleWithUUID.js';
export type { SimpleWithUUIDInsert, SimpleWithUUIDSelect } from './SimpleWithUUID.js';

export { simpleWithVersionSchema } from './SimpleWithVersion.js';
export type { SimpleWithVersionInsert, SimpleWithVersionSelect } from './SimpleWithVersion.js';

export { storeSchema } from './Store.js';
export type { StoreInsert, StoreSelect } from './Store.js';

export { studentSchema } from './Student.js';
export type { StudentInsert, StudentSelect } from './Student.js';

export { studentClassroomSchema } from './StudentClassroom.js';
export type { StudentClassroomInsert, StudentClassroomSelect } from './StudentClassroom.js';

export { teacherSchema } from './Teacher.js';
export type { TeacherInsert, TeacherSelect } from './Teacher.js';

export { teacherClassroomSchema } from './TeacherClassroom.js';
export type { TeacherClassroomInsert, TeacherClassroomSelect } from './TeacherClassroom.js';
