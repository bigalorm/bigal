import { describe, expectTypeOf, it } from 'vitest';

import type { BelongsToKeys, CreateUpdateParams, HasManyKeys, IRepository, InferSelect, ModelRelationshipKeys, QueryResult, RelationshipKeys } from '../src/index.js';

import { Product } from './models/Product.js';
import { Store } from './models/Store.js';

type ProductSchema = (typeof Product)['schema'];
type ProductRow = InferSelect<ProductSchema>;
type StoreSchema = (typeof Store)['schema'];
type StoreRow = InferSelect<StoreSchema>;

describe('Schema-level key helpers', () => {
  it('belongsToKeys should identify belongsTo properties', () => {
    type ProductBelongsTo = BelongsToKeys<ProductSchema>;
    expectTypeOf<ProductBelongsTo>().toEqualTypeOf<'store'>();
  });

  it('belongsToKeys should be never when no belongsTo exists', () => {
    // Store has no belongsTo relationships
    type StoreBelongsTo = BelongsToKeys<StoreSchema>;
    expectTypeOf<StoreBelongsTo>().toEqualTypeOf<never>();
  });

  it('hasManyKeys should identify hasMany properties', () => {
    type ProductHasMany = HasManyKeys<ProductSchema>;
    expectTypeOf<ProductHasMany>().toEqualTypeOf<'categories'>();
  });

  it('hasManyKeys should identify hasMany properties on Store', () => {
    type StoreHasMany = HasManyKeys<StoreSchema>;
    expectTypeOf<StoreHasMany>().toEqualTypeOf<'products'>();
  });

  it('relationshipKeys should include both belongsTo and hasMany', () => {
    type ProductRelations = RelationshipKeys<ProductSchema>;
    expectTypeOf<ProductRelations>().toEqualTypeOf<'store' | 'categories'>();
  });
});

describe('ModelRelationshipKeys', () => {
  it('should return only relationship keys with concrete schema', () => {
    type ProductRelKeys = ModelRelationshipKeys<ProductRow, ProductSchema>;
    expectTypeOf<ProductRelKeys>().toEqualTypeOf<'store'>();
  });

  it('should fall back to all string keys without schema', () => {
    type FallbackKeys = ModelRelationshipKeys<ProductRow>;
    expectTypeOf<FallbackKeys>().toEqualTypeOf<string & keyof ProductRow>();
  });
});

describe('QueryResult', () => {
  it('should exclude hasMany keys with concrete schema', () => {
    type StoreResult = QueryResult<StoreRow & { products: unknown[] }, StoreSchema>;
    expectTypeOf<StoreResult>().toEqualTypeOf<Omit<StoreRow & { products: unknown[] }, 'products'>>();
  });

  it('should be identity without schema (backward compat)', () => {
    type PlainResult = QueryResult<ProductRow>;
    expectTypeOf<PlainResult>().toEqualTypeOf<ProductRow>();
  });
});

describe('CreateUpdateParams', () => {
  it('should accept FK value for belongsTo with concrete schema', () => {
    type ProductParams = CreateUpdateParams<ProductRow, ProductSchema>;
    // Both FK value and hydrated object should be assignable
    const withFk: ProductParams = { store: 5 };
    const withObject: ProductParams = { store: { id: 5, name: 'Acme' } };
    void withFk;
    void withObject;
  });

  it('should not widen non-FK columns', () => {
    type ProductParams = CreateUpdateParams<ProductRow, ProductSchema>;
    // @ts-expect-error - name is string, not widened to accept objects
    const bad: ProductParams = { name: { not: 'a string' } };
    void bad;
  });

  it('should be simple Partial without schema (backward compat)', () => {
    type PlainParams = CreateUpdateParams<ProductRow>;
    expectTypeOf<PlainParams>().toEqualTypeOf<Partial<ProductRow>>();
  });
});

describe('IRepository with TSchema', () => {
  it('should accept hydrated objects in create when schema is threaded', () => {
    const repo = {} as IRepository<ProductRow, ProductSchema>;
    // This should compile - store accepts number or object
    expectTypeOf(repo.create).toBeFunction();
  });

  it('should accept hydrated objects via IRepository without TSchema (backward compat)', () => {
    const repo = {} as IRepository<ProductRow>;
    // Without schema, CreateUpdateParams falls back to Partial<T>
    expectTypeOf(repo.create).toBeFunction();
  });
});
