import { describe, expect, expectTypeOf, it } from 'vitest';

import type { InferInsert, InferSelect, TableDefinition } from '../src/schema/index.js';
import {
  belongsTo,
  bigserial,
  boolean,
  booleanArray,
  booleanColumn,
  bytea,
  createdAt,
  date,
  dateColumn,
  doublePrecision,
  hasMany,
  integer,
  integerArray,
  json,
  jsonb,
  real,
  serial,
  smallint,
  table,
  text,
  textArray,
  timestamp,
  timestamptz,
  updatedAt,
  uuid,
  varchar,
} from '../src/schema/index.js';

// ---------------------------------------------------------------------------
// Shared base column definitions
// ---------------------------------------------------------------------------

const modelBase = {
  id: serial().primaryKey(),
};

const timestamps = {
  createdAt: createdAt(),
  updatedAt: updatedAt(),
};

// ---------------------------------------------------------------------------
// Test model definitions (using real builders against real code)
// ---------------------------------------------------------------------------

// Registry object for circular references. Arrow functions in belongsTo/hasMany
// capture `tables` by reference, so they resolve correctly after all tables are assigned.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- opaque registry to break circular type inference
const tables: Record<string, TableDefinition<any, any>> = {};

const productSchema = {
  ...modelBase,
  ...timestamps,
  name: text().notNull(),
  sku: varchar({ length: 100 }),
  location: text(),
  aliases: textArray({ name: 'alias_names' }).default([]),
  priceCents: integer().notNull(),
  isActive: boolean().notNull().default(true),
  metadata: jsonb<{ color?: string }>(),
  store: belongsTo(() => tables.Store!),
  categories: hasMany(() => tables.Category!)
    .through(() => tables.ProductCategory!)
    .via('product'),
};
const Product = table('products', productSchema);
tables.Product = Product;

type ProductSelect = InferSelect<typeof productSchema>;
type ProductInsert = InferInsert<typeof productSchema>;

const storeSchema = {
  ...modelBase,
  ...timestamps,
  name: text(),
  products: hasMany(() => tables.Product!).via('store'),
};
const Store = table('stores', storeSchema);
tables.Store = Store;

type StoreSelect = InferSelect<typeof storeSchema>;
type StoreInsert = InferInsert<typeof storeSchema>;

const categorySchema = {
  ...modelBase,
  ...timestamps,
  name: text().notNull(),
  products: hasMany(() => tables.Product!)
    .through(() => tables.ProductCategory!)
    .via('category'),
};
const Category = table('categories', categorySchema);
tables.Category = Category;

type CategorySelect = InferSelect<typeof categorySchema>;

const productCategorySchema = {
  ...modelBase,
  product: belongsTo(() => tables.Product!),
  category: belongsTo(() => tables.Category!),
  ordering: integer(),
  isPrimary: booleanColumn(),
};
const ProductCategory = table('product__category', productCategorySchema);
tables.ProductCategory = ProductCategory;

type ProductCategorySelect = InferSelect<typeof productCategorySchema>;
type ProductCategoryInsert = InferInsert<typeof productCategorySchema>;

// String primary key model
const stringIdSchema = {
  id: text().primaryKey(),
  name: text().notNull(),
};
const SimpleWithStringId = table('simple_with_string_id', stringIdSchema);

type StringIdSelect = typeof SimpleWithStringId.$inferSelect;
type StringIdInsert = typeof SimpleWithStringId.$inferInsert;

// Self-referential model
const selfRefSchema = {
  ...modelBase,
  name: text().notNull(),
  parent: belongsTo(() => tables.SelfRef!),
  children: hasMany(() => tables.SelfRef!).via('parent'),
};
const SelfRef = table('self_ref', selfRefSchema);
tables.SelfRef = SelfRef;

type SelfRefSelect = InferSelect<typeof selfRefSchema>;

// JSON column with id property (the old NotEntity case)
interface IJsonPayload {
  id: string;
  message: string;
}

const jsonWithIdSchema = {
  ...modelBase,
  name: text().notNull(),
  payload: jsonb<IJsonPayload>(),
};
const JsonWithId = table('json_with_id', jsonWithIdSchema);

type JsonWithIdSelect = typeof JsonWithId.$inferSelect;

// Every column type
const kitchenSinkSchema = {
  ...modelBase,
  textCol: text().notNull(),
  varcharCol: varchar({ length: 255 }),
  intCol: integer(),
  bigintCol: bigserial(),
  smallintCol: smallint(),
  realCol: real(),
  doubleCol: doublePrecision(),
  boolCol: booleanColumn().notNull().default(false),
  timestampCol: timestamp(),
  timestamptzCol: timestamptz(),
  dateCol: dateColumn(),
  jsonbCol: jsonb<{ nested: string }>(),
  jsonCol: json<string[]>(),
  uuidCol: uuid().unique(),
  byteaCol: bytea(),
  textArrayCol: textArray().default([]),
  intArrayCol: integerArray(),
  boolArrayCol: booleanArray(),
  createdAt: createdAt(),
};
const KitchenSink = table('kitchen_sink', kitchenSinkSchema);

type KitchenSinkSelect = typeof KitchenSink.$inferSelect;
type KitchenSinkInsert = typeof KitchenSink.$inferInsert;

// Readonly model (view)
const readonlyViewSchema = {
  ...modelBase,
  name: text(),
  totalProducts: integer(),
};
const ReadonlyView = table('store_summary', readonlyViewSchema, { readonly: true });

// Model with hooks
const hookedSchema = {
  ...modelBase,
  name: text().notNull(),
};
const HookedModel = table('hooked', hookedSchema, {
  hooks: {
    beforeCreate(values) {
      return { ...values, name: `created: ${values.name}` };
    },
  },
});

// ---------------------------------------------------------------------------
// Type-level tests
// ---------------------------------------------------------------------------

describe('Schema builder type inference', () => {
  describe('$inferSelect', () => {
    describe('Product', () => {
      it('id is number (serial = notNull + primaryKey)', () => {
        expectTypeOf<ProductSelect['id']>().toEqualTypeOf<number>();
      });

      it('name is string (text + notNull)', () => {
        expectTypeOf<ProductSelect['name']>().toEqualTypeOf<string>();
      });

      it('sku is string | null (varchar, nullable)', () => {
        expectTypeOf<ProductSelect['sku']>().toEqualTypeOf<string | null>();
      });

      it('location is string | null (text, nullable)', () => {
        expectTypeOf<ProductSelect['location']>().toEqualTypeOf<string | null>();
      });

      it('aliases is string[] | null (textArray + default, still nullable)', () => {
        expectTypeOf<ProductSelect['aliases']>().toEqualTypeOf<string[] | null>();
      });

      it('priceCents is number (integer + notNull)', () => {
        expectTypeOf<ProductSelect['priceCents']>().toEqualTypeOf<number>();
      });

      it('isActive is boolean (boolean + notNull + default)', () => {
        expectTypeOf<ProductSelect['isActive']>().toEqualTypeOf<boolean>();
      });

      it('metadata is { color?: string } | null (jsonb, nullable)', () => {
        expectTypeOf<ProductSelect['metadata']>().toEqualTypeOf<{ color?: string } | null>();
      });

      it('store is number (belongsTo FK)', () => {
        expectTypeOf<ProductSelect['store']>().toEqualTypeOf<number>();
      });

      it('categories excluded (hasMany not in select)', () => {
        type HasCategories = 'categories' extends keyof ProductSelect ? true : false;
        expectTypeOf<HasCategories>().toEqualTypeOf<false>();
      });

      it('createdAt is Date (auto-set, notNull)', () => {
        expectTypeOf<ProductSelect['createdAt']>().toEqualTypeOf<Date>();
      });

      it('updatedAt is Date (auto-set, notNull)', () => {
        expectTypeOf<ProductSelect['updatedAt']>().toEqualTypeOf<Date>();
      });
    });

    describe('Store', () => {
      it('id is number', () => {
        expectTypeOf<StoreSelect['id']>().toEqualTypeOf<number>();
      });

      it('name is string | null', () => {
        expectTypeOf<StoreSelect['name']>().toEqualTypeOf<string | null>();
      });

      it('products excluded (hasMany)', () => {
        type HasProducts = 'products' extends keyof StoreSelect ? true : false;
        expectTypeOf<HasProducts>().toEqualTypeOf<false>();
      });
    });

    describe('ProductCategory (junction table)', () => {
      it('product is number (belongsTo FK)', () => {
        expectTypeOf<ProductCategorySelect['product']>().toEqualTypeOf<number>();
      });

      it('category is number (belongsTo FK)', () => {
        expectTypeOf<ProductCategorySelect['category']>().toEqualTypeOf<number>();
      });

      it('ordering is number | null', () => {
        expectTypeOf<ProductCategorySelect['ordering']>().toEqualTypeOf<number | null>();
      });

      it('isPrimary is boolean | null', () => {
        expectTypeOf<ProductCategorySelect['isPrimary']>().toEqualTypeOf<boolean | null>();
      });
    });

    describe('StringId model', () => {
      it('id is string (text + primaryKey)', () => {
        expectTypeOf<StringIdSelect['id']>().toEqualTypeOf<string>();
      });

      it('name is string (notNull)', () => {
        expectTypeOf<StringIdSelect['name']>().toEqualTypeOf<string>();
      });
    });

    describe('SelfReferential model', () => {
      it('parent is number (belongsTo FK)', () => {
        expectTypeOf<SelfRefSelect['parent']>().toEqualTypeOf<number>();
      });

      it('children excluded (hasMany)', () => {
        type HasChildren = 'children' extends keyof SelfRefSelect ? true : false;
        expectTypeOf<HasChildren>().toEqualTypeOf<false>();
      });
    });

    describe('JSON column with id property (old NotEntity case)', () => {
      it('payload is IJsonPayload | null (not confused with a relationship)', () => {
        expectTypeOf<JsonWithIdSelect['payload']>().toEqualTypeOf<IJsonPayload | null>();
      });

      it('payload.id is string (JSON shape preserved)', () => {
        type PayloadType = NonNullable<JsonWithIdSelect['payload']>;
        expectTypeOf<PayloadType['id']>().toEqualTypeOf<string>();
        expectTypeOf<PayloadType['message']>().toEqualTypeOf<string>();
      });
    });

    describe('KitchenSink — every column type', () => {
      it('text + notNull → string', () => {
        expectTypeOf<KitchenSinkSelect['textCol']>().toEqualTypeOf<string>();
      });

      it('varchar → string | null', () => {
        expectTypeOf<KitchenSinkSelect['varcharCol']>().toEqualTypeOf<string | null>();
      });

      it('integer → number | null', () => {
        expectTypeOf<KitchenSinkSelect['intCol']>().toEqualTypeOf<number | null>();
      });

      it('bigserial → number (notNull + hasDefault)', () => {
        expectTypeOf<KitchenSinkSelect['bigintCol']>().toEqualTypeOf<number>();
      });

      it('smallint → number | null', () => {
        expectTypeOf<KitchenSinkSelect['smallintCol']>().toEqualTypeOf<number | null>();
      });

      it('real → number | null', () => {
        expectTypeOf<KitchenSinkSelect['realCol']>().toEqualTypeOf<number | null>();
      });

      it('doublePrecision → number | null', () => {
        expectTypeOf<KitchenSinkSelect['doubleCol']>().toEqualTypeOf<number | null>();
      });

      it('boolean + notNull + default → boolean', () => {
        expectTypeOf<KitchenSinkSelect['boolCol']>().toEqualTypeOf<boolean>();
      });

      it('timestamp → Date | null', () => {
        expectTypeOf<KitchenSinkSelect['timestampCol']>().toEqualTypeOf<Date | null>();
      });

      it('timestamptz → Date | null', () => {
        expectTypeOf<KitchenSinkSelect['timestamptzCol']>().toEqualTypeOf<Date | null>();
      });

      it('date → Date | null', () => {
        expectTypeOf<KitchenSinkSelect['dateCol']>().toEqualTypeOf<Date | null>();
      });

      it('jsonb<T> → T | null', () => {
        expectTypeOf<KitchenSinkSelect['jsonbCol']>().toEqualTypeOf<{ nested: string } | null>();
      });

      it('json<T> → T | null', () => {
        expectTypeOf<KitchenSinkSelect['jsonCol']>().toEqualTypeOf<string[] | null>();
      });

      it('uuid → string | null', () => {
        expectTypeOf<KitchenSinkSelect['uuidCol']>().toEqualTypeOf<string | null>();
      });

      it('bytea → Buffer | null', () => {
        expectTypeOf<KitchenSinkSelect['byteaCol']>().toEqualTypeOf<Buffer | null>();
      });

      it('textArray + default → string[] | null', () => {
        expectTypeOf<KitchenSinkSelect['textArrayCol']>().toEqualTypeOf<string[] | null>();
      });

      it('integerArray → number[] | null', () => {
        expectTypeOf<KitchenSinkSelect['intArrayCol']>().toEqualTypeOf<number[] | null>();
      });

      it('booleanArray → boolean[] | null', () => {
        expectTypeOf<KitchenSinkSelect['boolArrayCol']>().toEqualTypeOf<boolean[] | null>();
      });

      it('createdAt → Date', () => {
        expectTypeOf<KitchenSinkSelect['createdAt']>().toEqualTypeOf<Date>();
      });
    });
  });

  describe('$inferInsert', () => {
    describe('Product', () => {
      it('requires name (text + notNull, no default)', () => {
        expectTypeOf<Pick<Required<ProductInsert>, 'name'>>().toEqualTypeOf<{ name: string }>();
      });

      it('requires priceCents (integer + notNull, no default)', () => {
        expectTypeOf<Pick<Required<ProductInsert>, 'priceCents'>>().toEqualTypeOf<{ priceCents: number }>();
      });

      it('requires store (belongsTo FK)', () => {
        expectTypeOf<Pick<Required<ProductInsert>, 'store'>>().toEqualTypeOf<{ store: number }>();
      });

      it('accepts minimal insert with only required fields', () => {
        const minimal = { name: 'Widget', priceCents: 999, store: 1 } as const;
        expectTypeOf(minimal).toMatchTypeOf<ProductInsert>();
      });

      it('allows optional id (primaryKey)', () => {
        const withId = { id: 42, name: 'Widget', priceCents: 999, store: 1 } as const;
        expectTypeOf(withId).toMatchTypeOf<ProductInsert>();
      });

      it('allows optional sku (nullable)', () => {
        const withSku = { name: 'Widget', priceCents: 999, store: 1, sku: 'ABC' } as const;
        expectTypeOf(withSku).toMatchTypeOf<ProductInsert>();
      });

      it('allows optional isActive (has default)', () => {
        const withActive = { name: 'Widget', priceCents: 999, store: 1, isActive: false } as const;
        expectTypeOf(withActive).toMatchTypeOf<ProductInsert>();
      });

      it('excludes categories (hasMany)', () => {
        type HasCategories = 'categories' extends keyof ProductInsert ? true : false;
        expectTypeOf<HasCategories>().toEqualTypeOf<false>();
      });

      it('does not require createdAt or updatedAt (autoSet)', () => {
        const minimal = { name: 'Widget', priceCents: 999, store: 1 } as const;
        expectTypeOf(minimal).toMatchTypeOf<ProductInsert>();
      });
    });

    describe('Store', () => {
      it('accepts empty insert (all fields optional)', () => {
        expectTypeOf<{}>().toMatchTypeOf<StoreInsert>();
      });
    });

    describe('ProductCategory (junction table)', () => {
      it('requires product and category (belongsTo FKs)', () => {
        const minimal = { product: 1, category: 2 } as const;
        expectTypeOf(minimal).toMatchTypeOf<ProductCategoryInsert>();
      });

      it('allows optional ordering and isPrimary', () => {
        const full = { product: 1, category: 2, ordering: 1, isPrimary: true } as const;
        expectTypeOf(full).toMatchTypeOf<ProductCategoryInsert>();
      });
    });

    describe('StringId model', () => {
      it('requires name but not id (primaryKey = optional)', () => {
        const minimal = { name: 'test' } as const;
        expectTypeOf(minimal).toMatchTypeOf<StringIdInsert>();
      });

      it('allows id as string', () => {
        const withId = { id: 'abc-123', name: 'test' } as const;
        expectTypeOf(withId).toMatchTypeOf<StringIdInsert>();
      });
    });

    describe('KitchenSink', () => {
      it('requires only textCol (the only notNull + noDefault non-PK column)', () => {
        const minimal = { textCol: 'hello' } as const;
        expectTypeOf(minimal).toMatchTypeOf<KitchenSinkInsert>();
      });
    });
  });

  describe('Shared columns via spread', () => {
    it('all models with modelBase have id: number in select', () => {
      expectTypeOf<ProductSelect['id']>().toEqualTypeOf<number>();
      expectTypeOf<StoreSelect['id']>().toEqualTypeOf<number>();
      expectTypeOf<CategorySelect['id']>().toEqualTypeOf<number>();
      expectTypeOf<KitchenSinkSelect['id']>().toEqualTypeOf<number>();
    });

    it('all models with timestamps have createdAt and updatedAt as Date', () => {
      expectTypeOf<ProductSelect['createdAt']>().toEqualTypeOf<Date>();
      expectTypeOf<ProductSelect['updatedAt']>().toEqualTypeOf<Date>();
      expectTypeOf<StoreSelect['createdAt']>().toEqualTypeOf<Date>();
      expectTypeOf<StoreSelect['updatedAt']>().toEqualTypeOf<Date>();
    });
  });
});

// ---------------------------------------------------------------------------
// Runtime tests
// ---------------------------------------------------------------------------

describe('Schema builder runtime behavior', () => {
  describe('table()', () => {
    it('sets tableName', () => {
      expect(Product.tableName).toBe('products');
      expect(Store.tableName).toBe('stores');
      expect(ProductCategory.tableName).toBe('product__category');
    });

    it('rejects invalid table names', () => {
      expect(() => table('', { id: serial() })).toThrow();
    });

    it('freezes the returned definition', () => {
      expect(Object.isFrozen(Product)).toBe(true);
    });

    it('sets readonly flag from options', () => {
      expect(ReadonlyView.isReadonly).toBe(true);
      expect(Product.isReadonly).toBe(false);
    });

    it('sets schema from options', () => {
      const withSchema = table('foo', { id: serial() }, { schema: 'audit' });
      expect(withSchema.dbSchema).toBe('audit');
    });

    it('sets connection from options', () => {
      const withConn = table('foo', { id: serial() }, { connection: 'analytics' });
      expect(withConn.connection).toBe('analytics');
    });
  });

  describe('Column metadata', () => {
    it('builds columnsByPropertyName', () => {
      expect(Product.columnsByPropertyName).toHaveProperty('name');
      expect(Product.columnsByPropertyName).toHaveProperty('store');
      expect(Product.columnsByPropertyName).toHaveProperty('id');
    });

    it('builds columnsByColumnName', () => {
      expect(Product.columnsByColumnName).toHaveProperty('name');
      expect(Product.columnsByColumnName).toHaveProperty('store_id');
      expect(Product.columnsByColumnName).toHaveProperty('id');
    });

    it('identifies the primary key column', () => {
      expect(Product.primaryKeyColumn).toBeDefined();
      expect(Product.primaryKeyColumn?.propertyName).toBe('id');
    });

    it('identifies createDate columns', () => {
      expect(Product.createDateColumns).toHaveLength(1);
      expect(Product.createDateColumns[0]?.propertyName).toBe('createdAt');
    });

    it('identifies updateDate columns', () => {
      expect(Product.updateDateColumns).toHaveLength(1);
      expect(Product.updateDateColumns[0]?.propertyName).toBe('updatedAt');
    });

    it('tracks belongsTo entries', () => {
      expect(Product.belongsToEntries).toHaveLength(1);
      expect(Product.belongsToEntries[0]?.propertyName).toBe('store');
    });

    it('tracks hasMany entries', () => {
      expect(Product.hasManyEntries).toHaveLength(1);
      expect(Product.hasManyEntries[0]?.propertyName).toBe('categories');
    });

    it('counts all columns including relationships', () => {
      // id, name, sku, location, aliases, priceCents, isActive, metadata, store, categories, createdAt, updatedAt
      expect(Product.columns).toHaveLength(12);
    });
  });

  describe('ColumnBuilder chain methods', () => {
    it('notNull sets isNotNull on config', () => {
      const builder = text().notNull();
      expect(builder.config.isNotNull).toBe(true);
    });

    it('default sets hasDefaultValue and defaultValue', () => {
      const builder = text().default('bar');
      expect(builder.config.hasDefaultValue).toBe(true);
      expect(builder.config.defaultValue).toBe('bar');
    });

    it('primaryKey sets isPrimaryKey, isNotNull, and hasDefaultValue', () => {
      const builder = integer().primaryKey();
      expect(builder.config.isPrimaryKey).toBe(true);
      expect(builder.config.isNotNull).toBe(true);
      expect(builder.config.hasDefaultValue).toBe(true);
    });

    it('unique sets isUnique', () => {
      const builder = uuid().unique();
      expect(builder.config.isUnique).toBe(true);
    });

    it('chains are composable', () => {
      const builder = text().notNull().unique();
      expect(builder.config.isNotNull).toBe(true);
      expect(builder.config.isUnique).toBe(true);
    });
  });

  describe('Column builder factories', () => {
    it('serial sets correct defaults', () => {
      const builder = serial();
      expect(builder.config.columnType).toBe('SERIAL');
      expect(builder.config.isNotNull).toBe(true);
      expect(builder.config.hasDefaultValue).toBe(true);
      expect(builder.config.isPrimaryKey).toBe(true);
    });

    it('createdAt sets auto-set flags', () => {
      const builder = createdAt();
      expect(builder.config.dbColumnName).toBe('created_at');
      expect(builder.config.isNotNull).toBe(true);
      expect(builder.config.isAutoSet).toBe(true);
      expect(builder.config.isCreateDate).toBe(true);
    });

    it('updatedAt sets auto-set flags', () => {
      const builder = updatedAt();
      expect(builder.config.dbColumnName).toBe('updated_at');
      expect(builder.config.isNotNull).toBe(true);
      expect(builder.config.isAutoSet).toBe(true);
      expect(builder.config.isUpdateDate).toBe(true);
    });

    it('varchar stores max length', () => {
      const builder = varchar({ length: 255 });
      expect(builder.config.maxLength).toBe(255);
    });

    it('createdAt accepts custom column name', () => {
      const builder = createdAt({ name: 'created' });
      expect(builder.config.dbColumnName).toBe('created');
    });
  });

  describe('Relationship builders', () => {
    it('belongsTo stores FK column name', () => {
      const builder = belongsTo(() => Store, 'store_id');
      expect(builder.dbColumnName).toBe('store_id');
    });

    it('belongsTo accepts options object for FK column name', () => {
      const builder = belongsTo(() => Store, { name: 'shop_id' });
      expect(builder.dbColumnName).toBe('shop_id');
    });

    it('belongsTo auto-derives FK column name when omitted', () => {
      const builder = belongsTo(() => Store);
      expect(builder.dbColumnName).toBe('');
    });

    it('hasMany stores via property name', () => {
      const builder = hasMany(() => Product).via('store');
      expect(builder.viaPropertyName).toBe('store');
    });

    it('hasMany with through stores through function', () => {
      const builder = hasMany(() => Category)
        .through(() => ProductCategory)
        .via('product');
      expect(builder.viaPropertyName).toBe('product');
      expect(builder.throughFn).toBeDefined();
    });
  });

  describe('Hooks', () => {
    it('stores hooks on the table definition', () => {
      expect(HookedModel.hooks).toBeDefined();
      expect(HookedModel.hooks?.beforeCreate).toBeTypeOf('function');
    });

    it('hooks are undefined when not provided', () => {
      expect(Product.hooks).toBeUndefined();
    });

    it('beforeCreate hook transforms values', () => {
      const hook = HookedModel.hooks?.beforeCreate;
      expect(hook).toBeDefined();
      const result = hook!({ name: 'test' });
      expect(result).toStrictEqual({ name: 'created: test' });
    });
  });

  describe('Column name aliasing', () => {
    it('boolean and booleanColumn are the same function', () => {
      const fromAlias = boolean();
      const fromFull = booleanColumn();
      expect(fromAlias.config.columnType).toBe(fromFull.config.columnType);
    });

    it('date and dateColumn are the same function', () => {
      const fromAlias = date();
      const fromFull = dateColumn();
      expect(fromAlias.config.columnType).toBe(fromFull.config.columnType);
    });
  });
});
