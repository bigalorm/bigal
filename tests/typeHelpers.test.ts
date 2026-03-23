import { describe, expectTypeOf, it } from 'vitest';

import type {
  BelongsToKeys,
  CreateUpdateParams,
  EntityOrId,
  HasManyKeys,
  IRepository,
  InferSelect,
  ModelRelationshipKeys,
  QueryResult,
  RelationshipKeys,
  Repository,
  WhereQuery,
} from '../src/index.js';
import { serial, table, text, varchar } from '../src/schema/index.js';

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
    expectTypeOf<ProductRelKeys>().toEqualTypeOf<'categories' | 'store'>();
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

  it('should accept TableDefinition directly and exclude hasMany', () => {
    type ProductResult = QueryResult<typeof Product>;
    // Should have id, name, sku, location, aliases, store - but NOT categories
    expectTypeOf<ProductResult>().toHaveProperty('id');
    expectTypeOf<ProductResult>().toHaveProperty('name');
    expectTypeOf<ProductResult>().toHaveProperty('store');
    expectTypeOf<ProductResult>().not.toHaveProperty('categories');
  });

  it('should accept TableDefinition and match InferSelect minus hasMany', () => {
    type StoreResult = QueryResult<typeof Store>;
    // Should have id, name - but NOT products (hasMany)
    expectTypeOf<StoreResult>().toHaveProperty('id');
    expectTypeOf<StoreResult>().toHaveProperty('name');
    expectTypeOf<StoreResult>().not.toHaveProperty('products');
  });

  it('should accept repository type and exclude hasMany', () => {
    type ProductRepo = IRepository<ProductRow, ProductSchema>;
    type ProductResult = QueryResult<ProductRepo>;
    expectTypeOf<ProductResult>().toHaveProperty('id');
    expectTypeOf<ProductResult>().toHaveProperty('store');
    expectTypeOf<ProductResult>().not.toHaveProperty('categories');
  });

  it('should be identity without schema (backward compat)', () => {
    type PlainResult = QueryResult<ProductRow>;
    expectTypeOf<PlainResult>().toEqualTypeOf<ProductRow>();
  });
});

describe('EntityOrId and InferSelect', () => {
  it('should widen belongsTo to EntityOrId in InferSelect', () => {
    expectTypeOf<ProductRow['store']>().toEqualTypeOf<EntityOrId<number>>();
  });

  it('should accept FK value for belongsTo', () => {
    const row: Pick<ProductRow, 'store'> = { store: 5 };
    void row;
  });

  it('should accept entity object with id for belongsTo', () => {
    const row: Pick<ProductRow, 'store'> = { store: { id: 5, name: 'Acme' } };
    void row;
  });

  it('should narrow belongsTo back to FK type in QueryResult', () => {
    type ProductResult = QueryResult<typeof Product>;
    expectTypeOf<ProductResult['store']>().toEqualTypeOf<number>();
  });
});

describe('CreateUpdateParams', () => {
  it('should accept FK value for belongsTo', () => {
    type ProductParams = CreateUpdateParams<ProductRow>;
    const withFk: ProductParams = { store: 5 };
    const withObject: ProductParams = { store: { id: 5, name: 'Acme' } };
    void withFk;
    void withObject;
  });

  it('should not widen non-FK columns', () => {
    type ProductParams = CreateUpdateParams<ProductRow>;
    // @ts-expect-error - name is string, not widened to accept objects
    const bad: ProductParams = { name: { not: 'a string' } };
    void bad;
  });

  it('should be Partial<T>', () => {
    type ProductParams = CreateUpdateParams<ProductRow>;
    expectTypeOf<ProductParams>().toEqualTypeOf<Partial<ProductRow>>();
  });
});

describe('text() enum narrowing', () => {
  it('should narrow text<T> to the specified union', () => {
    const EnumModel = table('test', {
      id: serial().primaryKey(),
      status: text<'active' | 'inactive'>().notNull(),
    });

    type Row = InferSelect<(typeof EnumModel)['schema']>;
    expectTypeOf<Row['status']>().toEqualTypeOf<'active' | 'inactive'>();
  });

  it('should default to string when no generic is provided', () => {
    const PlainModel = table('test', {
      id: serial().primaryKey(),
      name: text().notNull(),
    });

    type Row = InferSelect<(typeof PlainModel)['schema']>;
    expectTypeOf<Row['name']>().toEqualTypeOf<string>();
  });

  it('should narrow varchar<T> the same way', () => {
    const EnumModel = table('test', {
      id: serial().primaryKey(),
      role: varchar<'admin' | 'user'>({ length: 50 }).notNull(),
    });

    type Row = InferSelect<(typeof EnumModel)['schema']>;
    expectTypeOf<Row['role']>().toEqualTypeOf<'admin' | 'user'>();
  });
});

describe('WhereQuery accepts TableDefinition', () => {
  it('should accept TableDefinition and allow querying by column values', () => {
    const where: WhereQuery<typeof Product> = { name: 'Widget' };
    void where;
  });

  it('should accept entity object for belongsTo FK fields', () => {
    const where: WhereQuery<typeof Product> = { store: { id: 5, name: 'Acme' } };
    void where;
  });
});

describe('Repository accepts TableDefinition', () => {
  it('should allow Repository<typeof Product> as a type annotation', () => {
    const repo = {} as Repository<typeof Product>;
    expectTypeOf(repo.create).toBeFunction();
    expectTypeOf(repo.find).toBeFunction();
    expectTypeOf(repo.destroy).toBeFunction();
  });

  it('should thread schema through for CreateUpdateParams', () => {
    const repo = {} as Repository<typeof Product>;
    // This should compile - store accepts number or hydrated object
    expectTypeOf(repo.create).toBeFunction();
  });
});

describe('IRepository with TSchema', () => {
  it('should accept hydrated objects in create when schema is threaded', () => {
    const repo = {} as IRepository<ProductRow, ProductSchema>;
    expectTypeOf(repo.create).toBeFunction();
  });

  it('should accept hydrated objects via IRepository without TSchema (backward compat)', () => {
    const repo = {} as IRepository<ProductRow>;
    expectTypeOf(repo.create).toBeFunction();
  });
});
