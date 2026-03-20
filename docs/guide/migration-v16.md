---
description: Step-by-step guide for upgrading from BigAl v15 (decorators) to v16 (function-based schema API).
---

# Migrating to v16

BigAl v16 replaces the decorator-based model system with a function-based schema API. Models are now
plain objects defined with `table()` and PostgreSQL-native column builders. Types are inferred from the
schema definition -- no separate interfaces, no `extends Entity`, no `experimentalDecorators`.

## Requirements

- **Node.js 22** or later (v15 supported Node.js 20.11.0+)
- No `experimentalDecorators` or `useDefineForClassFields` in your `tsconfig.json`
- Works with tsc, esbuild, SWC, Vite, and Playwright without transpiler flags

## Breaking changes at a glance

| v15 (decorators)                      | v16 (function-based)                         |
| ------------------------------------- | -------------------------------------------- |
| `class Product extends Entity`        | `const Product = table('products', { ... })` |
| `@table()`, `@column()` decorators    | `table()`, `text()`, `integer()`, etc.       |
| `@primaryColumn({ type: 'integer' })` | `serial('id').primaryKey()`                  |
| `@column({ model: () => 'Store' })`   | `belongsTo(() => Store, 'store_id')`         |
| `@column({ collection: ... })`        | `hasMany(() => Product).via('store')`        |
| `initialize({ models, pool })`        | `createBigAl({ pool, models })`              |
| `repos.Product as Repository<T>`      | `bigal.getRepository(Product)`               |
| `Entity`, `EntityStatic`              | `InferSelect<T>`, `InferInsert<T>`           |
| `NotEntity<T>`                        | Removed (no longer needed)                   |
| `.toJSON()`                           | Removed (results are always plain objects)   |
| `DEBUG_BIGAL` env var                 | `onQuery` callback (env var still works)     |
| Lifecycle hooks as static methods     | `hooks` option in `table()`                  |

## Model definition

v15 used decorated classes extending `Entity`:

```ts
// v15
import { column, createDateColumn, Entity, primaryColumn, table, updateDateColumn } from 'bigal';

@table({ name: 'products' })
export class Product extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({ type: 'string', required: true })
  public name!: string;

  @column({ type: 'string' })
  public sku?: string;

  @column({ type: 'integer', required: true, name: 'price_cents' })
  public priceCents!: number;

  @column({ type: 'boolean', required: true, defaultsTo: true, name: 'is_active' })
  public isActive!: boolean;

  @column({ type: 'json' })
  public metadata?: { color?: string };

  @createDateColumn()
  public createdAt!: Date;

  @updateDateColumn()
  public updatedAt!: Date;
}
```

v16 uses function-based schema definitions:

```ts
// v16
import { boolean, createdAt, defineTable as table, integer, jsonb, serial, text, updatedAt, varchar } from 'bigal';

export const Product = table('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  sku: varchar('sku', { length: 100 }),
  priceCents: integer('price_cents').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  metadata: jsonb<{ color?: string }>('metadata'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// Types are inferred -- no separate interface needed
type ProductRow = typeof Product.$inferSelect;
type ProductInsert = typeof Product.$inferInsert;
```

Key differences:

- No class, no `extends Entity`
- Column types are PostgreSQL-native (`text`, `integer`, `boolean`) instead of abstract (`'string'`, `'integer'`)
- Nullability and defaults are expressed through chain methods (`.notNull()`, `.default()`)
- Types are inferred from the schema; no manual interface required

## Base class and shared columns

v15 used abstract class inheritance:

```ts
// v15
@table({ name: '' })
export abstract class BaseModel extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;
  @createDateColumn()
  public createdAt!: Date;
  @updateDateColumn()
  public updatedAt!: Date;
}

@table({ name: 'products' })
export class Product extends BaseModel {
  @column({ type: 'string', required: true })
  public name!: string;
}
```

v16 uses plain objects with spread:

```ts
// v16 -- shared.ts
import { createdAt, serial, updatedAt } from 'bigal';

export const modelBase = {
  id: serial('id').primaryKey(),
};

export const timestamps = {
  createdAt: createdAt(),
  updatedAt: updatedAt(),
};

// v16 -- Product.ts
import { defineTable as table, text } from 'bigal';
import { modelBase, timestamps } from './shared';

export const Product = table('products', {
  ...modelBase,
  ...timestamps,
  name: text('name').notNull(),
});
```

Shared columns are plain objects that you spread into each schema definition. No abstract classes or
inheritance chains.

## Column types

Each v15 column type maps to a PostgreSQL-native builder in v16:

| v15 decorator                         | v16 builder                                                  |
| ------------------------------------- | ------------------------------------------------------------ |
| `@column({ type: 'string' })`         | `text('col_name')` or `varchar('col_name', { length: 100 })` |
| `@column({ type: 'integer' })`        | `integer('col_name')`                                        |
| `@column({ type: 'float' })`          | `real('col_name')` or `doublePrecision('col_name')`          |
| `@column({ type: 'boolean' })`        | `boolean('col_name')`                                        |
| `@column({ type: 'date' })`           | `date('col_name')`                                           |
| `@column({ type: 'datetime' })`       | `timestamptz('col_name')`                                    |
| `@column({ type: 'json' })`           | `json('col_name')` or `jsonb('col_name')`                    |
| `@column({ type: 'string[]' })`       | `textArray('col_name')`                                      |
| `@column({ type: 'integer[]' })`      | `integerArray('col_name')`                                   |
| `@column({ type: 'boolean[]' })`      | `booleanArray('col_name')`                                   |
| `@primaryColumn({ type: 'integer' })` | `serial('col_name').primaryKey()`                            |

Additional v16 builders with no v15 equivalent: `bigserial`, `bigint`, `smallint`, `uuid`, `bytea`,
`timestamp` (without timezone).

### Column modifiers

| v15 option            | v16 chain method          |
| --------------------- | ------------------------- |
| `required: true`      | `.notNull()`              |
| `defaultsTo: value`   | `.default(value)`         |
| Primary key           | `.primaryKey()`           |
| (no equivalent)       | `.unique()`               |
| `@createDateColumn()` | `createdAt()` convenience |
| `@updateDateColumn()` | `updatedAt()` convenience |

`serial()` and `bigserial()` imply `.notNull()` and `.default()` automatically -- they always produce
a non-null number on select and are optional on insert.

`.primaryKey()` implies `.notNull()` and makes the column optional on insert (database assigns the
value).

## Relationships

### Many-to-one (belongsTo)

```ts
// v15
@column({ model: () => 'Store', name: 'store_id' })
public store!: number | Store;

// v16
store: belongsTo(() => Store, 'store_id'),
```

The `$inferSelect` type for a `belongsTo` column is the FK type (typically `number`), not a union.
After `.populate('store')`, the type changes to the related entity.

### One-to-many (hasMany)

```ts
// v15
@column({ collection: () => 'Product', via: 'store' })
public products?: Product[];

// v16
products: hasMany(() => Product).via('store'),
```

`hasMany` columns are excluded from both `$inferSelect` and `$inferInsert`. They only appear after
`.populate()`.

### Many-to-many (hasMany with through)

```ts
// v15
@column({
  collection: () => 'Category',
  through: () => 'ProductCategory',
  via: 'product',
})
public categories?: Category[];

// v16
categories: hasMany(() => Category)
  .through(() => ProductCategory)
  .via('product'),
```

### Circular references

Arrow functions in `belongsTo` and `hasMany` defer evaluation, allowing circular references between
tables. If you have tables that reference each other, use a registry pattern:

```ts
const tables: Record<string, TableDefinition<any, any>> = {};

const Product = table('products', {
  store: belongsTo(() => tables.Store!, 'store_id'),
  // ...
});
tables.Product = Product;

const Store = table('stores', {
  products: hasMany(() => tables.Product!).via('store'),
  // ...
});
tables.Store = Store;
```

## Initialization

```ts
// v15
import { initialize } from 'bigal';
import type { IRepository } from 'bigal';

const repos = initialize({ models: [Product, Store], pool });
const ProductRepo = repos.Product as IRepository<Product>;

// v16
import { createBigAl } from 'bigal';

const bigal = createBigAl({
  pool,
  models: [Product, Store, Category, ProductCategory],
});

const ProductRepo = bigal.getRepository(Product);
// ProductRepo is fully typed -- no assertion needed
```

`createBigAl()` validates all relationship references at construction time. If a `belongsTo` or
`hasMany` points to a table not in the `models` array, it throws immediately.

### createBigAl options

| Option         | Type                          | Description                                   |
| -------------- | ----------------------------- | --------------------------------------------- |
| `pool`         | `PoolLike`                    | Primary connection pool                       |
| `readonlyPool` | `PoolLike`                    | Pool for read operations (defaults to `pool`) |
| `models`       | `TableDefinition[]`           | All table definitions                         |
| `connections`  | `Record<string, IConnection>` | Named connections for multi-database setups   |
| `onQuery`      | `OnQueryCallback`             | Query observability callback                  |

## Results are always plain objects

In v15, query results were class instances with prototypes. You could call `.toJSON()` to get plain
objects.

In v16, all results are plain objects. There is no `.toJSON()` method and no class wrapper.

```ts
// v15
const product = await ProductRepo.findOne().where({ id: 42 }).toJSON();

// v16
const product = await ProductRepo.findOne().where({ id: 42 });
// Already a plain object -- no .toJSON() needed
```

## NotEntity\<T\> is removed

In v15, JSON columns with an `id` property required `NotEntity<T>` to prevent BigAl's type system from
treating them as entity relationships:

```ts
// v15
import type { NotEntity } from 'bigal';
interface IPayload { id: string; message: string; }

@column({ type: 'json' })
public payload?: NotEntity<IPayload>;
```

In v16, this is not needed. The type system uses column builder metadata (not structural typing on `id`)
to distinguish relationships from data columns:

```ts
// v16
interface IPayload { id: string; message: string; }

// In the schema definition:
payload: jsonb<IPayload>('payload'),
```

## Type imports

```ts
// v15
import { Entity } from 'bigal';
import type { EntityStatic, QueryResult } from 'bigal';

// v16
import type { InferSelect, InferInsert } from 'bigal';

type ProductRow = typeof Product.$inferSelect;
// or equivalently:
type ProductRow = InferSelect<typeof productSchema>;
```

`Entity` and `EntityStatic` are no longer needed for the new API. Use `$inferSelect` on the table
definition to get the row type, and `$inferInsert` for the insert type.

## Lifecycle hooks

v15 used static methods on the class:

```ts
// v15
@table({ name: 'products' })
export class Product extends Entity {
  // ... columns ...
  public static beforeCreate(values: Partial<Product>): Partial<Product> {
    return { ...values, slug: slugify(values.name!) };
  }
  public static beforeUpdate(values: Partial<Product>): Partial<Product> {
    return { ...values, updatedBy: getCurrentUserId() };
  }
}
```

v16 uses the `hooks` option in `table()`:

```ts
// v16
export const Product = table(
  'products',
  {
    // ... columns ...
  },
  {
    hooks: {
      beforeCreate(values) {
        return { ...values, slug: slugify(values.name) };
      },
      beforeUpdate(values) {
        return { ...values, updatedBy: getCurrentUserId() };
      },
    },
  },
);
```

The `values` parameter is fully typed based on the schema definition.

## Logging and observability

v15 used the `DEBUG_BIGAL` environment variable:

```sh
# v15
DEBUG_BIGAL=true node app.js
```

v16 adds a structured `onQuery` callback:

```ts
// v16
const bigal = createBigAl({
  pool,
  models: [Product, Store],
  onQuery({ sql, params, duration, error, model, operation }) {
    logger.debug({ sql, params, duration, model, operation });
  },
});
```

The `onQuery` callback receives structured data for every query. The `DEBUG_BIGAL` environment variable
still works as a fallback.

**Note:** `params` may contain sensitive data (user input, passwords, etc.). Use appropriate care when
logging.

## Removed exports

The following exports no longer exist in v16:

- `Entity`, `EntityStatic` -- no base class needed
- `NotEntity`, `NotEntityBrand` -- structural typing workaround no longer needed
- `@table()`, `@column()`, `@primaryColumn()`, `@createDateColumn()`, `@updateDateColumn()`,
  `@versionColumn()` decorators
- `initialize()` -- replaced by `createBigAl()`
- `.toJSON()` on query results -- results are already plain objects
- `FindResultJSON`, `FindOneResultJSON`, `CreateResultJSON`, `UpdateResultJSON`, `DestroyResultJSON`

## Query API is unchanged

The fluent query builder API is identical in v16. All of these work exactly as before:

```ts
// find with where, sort, limit
const products = await ProductRepo.find()
  .where({ name: { contains: 'widget' } })
  .sort('name')
  .limit(10);

// findOne with populate
const product = await ProductRepo.findOne().where({ id: 42 }).populate('store');

// count
const count = await ProductRepo.count().where({ isActive: true });

// create
const newProduct = await ProductRepo.create({ name: 'Widget', priceCents: 999, store: 1 });

// update
const updated = await ProductRepo.update({ id: 42 }, { name: 'Super Widget' });

// destroy
await ProductRepo.destroy({ id: 42 });

// upsert
await ProductRepo.create({ name: 'Widget', sku: 'WDG-001', priceCents: 999 }, { onConflict: { action: 'merge', targets: ['sku'], merge: ['priceCents'] } });
```

## Migration checklist

1. Update Node.js to v22 or later
2. Remove `experimentalDecorators` and `useDefineForClassFields` from `tsconfig.json`
3. Convert each model class to a `table()` call with column builders
4. Replace `extends Entity` / abstract base classes with shared column objects using spread
5. Replace `@column({ model: ... })` with `belongsTo()`
6. Replace `@column({ collection: ... })` with `hasMany()`
7. Replace `initialize()` with `createBigAl()` and `getRepository()`
8. Remove `NotEntity<T>` wrappers from JSON column types
9. Remove `.toJSON()` calls from queries
10. Replace `Entity` / `EntityStatic` type imports with `$inferSelect` / `$inferInsert`
11. Replace static lifecycle hooks with `hooks` option in `table()`
12. Replace `DEBUG_BIGAL` usage with `onQuery` callback (optional -- env var still works)
