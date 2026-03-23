import type { InferSelect } from '../../src/schema/index.js';

import type { Category } from './Category.js';
import type { Classroom } from './Classroom.js';
import type { ImportedItem } from './ImportedItem.js';
import type { KitchenSink } from './KitchenSink.js';
import type { LevelOne } from './LevelOne.js';
import type { LevelThree } from './LevelThree.js';
import type { LevelTwo } from './LevelTwo.js';
import type { ParkingLot } from './ParkingLot.js';
import type { ParkingSpace } from './ParkingSpace.js';
import type { Product } from './Product.js';
import type { ProductCategory } from './ProductCategory.js';
import type { ProductWithCreatedAt } from './ProductWithCreatedAt.js';
import type { ReadonlyProduct } from './ReadonlyProduct.js';
import type { RequiredPropertyWithDefaultValue } from './RequiredPropertyWithDefaultValue.js';
import type { RequiredPropertyWithDefaultValueFunction } from './RequiredPropertyWithDefaultValueFunction.js';
import type { SimpleWithCollections } from './SimpleWithCollections.js';
import type { SimpleWithCreatedAt } from './SimpleWithCreatedAt.js';
import type { SimpleWithCreatedAtAndUpdatedAt } from './SimpleWithCreatedAtAndUpdatedAt.js';
import type { SimpleWithJson } from './SimpleWithJson.js';
import type { SimpleWithOptionalEnum } from './SimpleWithOptionalEnum.js';
import type { SimpleWithRelationAndJson } from './SimpleWithRelationAndJson.js';
import type { SimpleWithSchema } from './SimpleWithSchema.js';
import type { SimpleWithSelfReference } from './SimpleWithSelfReference.js';
import type { SimpleWithStringCollection } from './SimpleWithStringCollection.js';
import type { SimpleWithStringId } from './SimpleWithStringId.js';
import type { SimpleWithUnion } from './SimpleWithUnion.js';
import type { SimpleWithUpdatedAt } from './SimpleWithUpdatedAt.js';
import type { SimpleWithUUID } from './SimpleWithUUID.js';
import type { SimpleWithVersion } from './SimpleWithVersion.js';
import type { Store } from './Store.js';
import type { Teacher } from './Teacher.js';
import type { TeacherClassroom } from './TeacherClassroom.js';

// ---------------------------------------------------------------------------
// Value exports
// ---------------------------------------------------------------------------

export { modelBase, stringIdBase, timestamps } from './base.js';
export { productColumns } from './Product.js';

export { Category } from './Category.js';
export { Classroom } from './Classroom.js';
export { ImportedItem } from './ImportedItem.js';
export { KitchenSink } from './KitchenSink.js';
export { LevelOne } from './LevelOne.js';
export { LevelTwo } from './LevelTwo.js';
export { LevelThree } from './LevelThree.js';
export { ParkingLot } from './ParkingLot.js';
export { ParkingSpace } from './ParkingSpace.js';
export { Product } from './Product.js';
export { ProductCategory } from './ProductCategory.js';
export { ProductWithCreatedAt } from './ProductWithCreatedAt.js';
export { ProductWithCreateUpdateDateTracking } from './ProductWithCreateUpdateDateTracking.js';
export { ReadonlyProduct } from './ReadonlyProduct.js';
export { RequiredPropertyWithDefaultValue } from './RequiredPropertyWithDefaultValue.js';
export { RequiredPropertyWithDefaultValueFunction } from './RequiredPropertyWithDefaultValueFunction.js';
export { SimpleWithCollections } from './SimpleWithCollections.js';
export { SimpleWithCreatedAt } from './SimpleWithCreatedAt.js';
export { SimpleWithCreatedAtAndUpdatedAt } from './SimpleWithCreatedAtAndUpdatedAt.js';
export { SimpleWithJson } from './SimpleWithJson.js';
export { SimpleWithOptionalEnum } from './SimpleWithOptionalEnum.js';
export { SimpleWithRelationAndJson } from './SimpleWithRelationAndJson.js';
export type { IJsonLikeEntity } from './SimpleWithRelationAndJson.js';
export { SimpleWithSchema } from './SimpleWithSchema.js';
export { SimpleWithSelfReference } from './SimpleWithSelfReference.js';
export { SimpleWithStringCollection } from './SimpleWithStringCollection.js';
export { SimpleWithStringId } from './SimpleWithStringId.js';
export { SimpleWithUUID } from './SimpleWithUUID.js';
export { SimpleWithUnion } from './SimpleWithUnion.js';
export { SimpleWithUpdatedAt } from './SimpleWithUpdatedAt.js';
export { SimpleWithVersion } from './SimpleWithVersion.js';
export { Store } from './Store.js';
export { Student } from './Student.js';
export { StudentClassroom } from './StudentClassroom.js';
export { Teacher } from './Teacher.js';
export { TeacherClassroom } from './TeacherClassroom.js';

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
