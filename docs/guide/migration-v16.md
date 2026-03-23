---
description: Step-by-step guide for upgrading from BigAl v15 (decorators) to v16 (function-based schema API).
---

# Migrating to v16

BigAl v16 replaces the decorator-based model system with a function-based schema API. Models are now
plain objects defined with `table()` and PostgreSQL-native column builders. Types are inferred from the
schema definition - no separate interfaces, no `extends Entity`, no `experimentalDecorators`.

## Requirements

- **Node.js 22** or later (v15 supported Node.js 20.11.0+)
- No `experimentalDecorators` or `useDefineForClassFields` in your `tsconfig.json`
- Works with tsc, esbuild, SWC, Vite, and Playwright without transpiler flags

## Breaking changes at a glance

| v15 (decorators)                      | v16 (function-based)                         |
| ------------------------------------- | -------------------------------------------- |
| `class Product extends Entity`        | `const Product = table('products', { ... })` |
| `@table()`, `@column()` decorators    | `table()`, `text()`, `integer()`, etc.       |
| `@primaryColumn({ type: 'integer' })` | `serial().primaryKey()`                      |
| `@column({ model: () => 'Store' })`   | `belongsTo('Store')`                         |
| `@column({ collection: ... })`        | `hasMany('Product').via('store')`            |
| `initialize({ models, pool })`        | `initialize({ pool, models: { ... } })`      |
| `repos.Product as Repository<T>`      | Typed destructuring or `getRepository()`     |
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

v16 uses function-based schema definitions. Column names are auto-derived from property keys
(snakeCase), so you no longer pass column names as arguments:

```ts
// v16
import { boolean, createdAt, defineTable as table, integer, jsonb, serial, text, updatedAt, varchar } from 'bigal';

export const Product = table('products', {
  id: serial().primaryKey(),
  name: text().notNull(),
  sku: varchar({ length: 100 }),
  priceCents: integer().notNull(),
  isActive: boolean().notNull().default(true),
  metadata: jsonb<{ color?: string }>(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// Types are inferred -- no separate interface needed
import type { InferSelect, InferInsert } from 'bigal';

type ProductRow = InferSelect<(typeof Product)['schema']>;
type ProductInsert = InferInsert<(typeof Product)['schema']>;
```

Key differences:

- No class, no `extends Entity`
- Column types are PostgreSQL-native (`text`, `integer`, `boolean`) instead of abstract (`'string'`, `'integer'`)
- Column names auto-derive from property keys - no explicit column name argument needed
- Nullability and defaults are expressed through chain methods (`.notNull()`, `.default()`)
- Types are inferred from the schema; no manual interface required
- Use `InferSelect` / `InferInsert` utility types (no `$inferSelect` / `$inferInsert` phantom types)

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
  id: serial().primaryKey(),
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
  name: text().notNull(),
});
```

Shared columns are plain objects that you spread into each schema definition. No abstract classes or
inheritance chains.

## Column types

Each v15 column type maps to a PostgreSQL-native builder in v16. Builders take no arguments - column
names auto-derive from property keys:

| v15 decorator                         | v16 builder                                |
| ------------------------------------- | ------------------------------------------ |
| `@column({ type: 'string' })`         | `text()` or `text<'a' \| 'b'>()` for enums |
| `@column({ type: 'integer' })`        | `integer()`                                |
| `@column({ type: 'float' })`          | `float()` or `double()`                    |
| `@column({ type: 'boolean' })`        | `boolean()`                                |
| `@column({ type: 'date' })`           | `date()`                                   |
| `@column({ type: 'datetime' })`       | `timestamptz()`                            |
| `@column({ type: 'json' })`           | `json()` or `jsonb()`                      |
| `@column({ type: 'string[]' })`       | `textArray()`                              |
| `@column({ type: 'integer[]' })`      | `integerArray()`                           |
| `@column({ type: 'boolean[]' })`      | `booleanArray()`                           |
| `@primaryColumn({ type: 'integer' })` | `serial().primaryKey()`                    |

Additional v16 builders with no v15 equivalent: `bigserial`, `bigint`, `smallint`, `uuid`, `bytea`,
`timestamp` (without timezone), `vector({ dimensions })`.

### Column modifiers

| v15 option            | v16 chain method          |
| --------------------- | ------------------------- |
| `required: true`      | `.notNull()`              |
| `defaultsTo: value`   | `.default(value)`         |
| Primary key           | `.primaryKey()`           |
| (no equivalent)       | `.unique()`               |
| `@createDateColumn()` | `createdAt()` convenience |
| `@updateDateColumn()` | `updatedAt()` convenience |
| `@versionColumn()`    | `integer().version()`     |

`serial()` and `bigserial()` imply `.notNull()` and `.default()` automatically - they always produce
a non-null number on select and are optional on insert.

`.primaryKey()` implies `.notNull()` and makes the column optional on insert (database assigns the
value).

## Relationships

v16 uses string model references. The FK column name is auto-derived from the property key.

### Many-to-one (belongsTo)

```ts
// v15
@column({ model: () => 'Store', name: 'store_id' })
public store!: number | Store;

// v16 -- FK column auto-derived as store_id
store: belongsTo('Store'),
```

The inferred select type for a `belongsTo` column is the FK type (typically `number`), not a union.
After `.populate('store')`, the type changes to the related entity.

### One-to-many (hasMany)

```ts
// v15
@column({ collection: () => 'Product', via: 'store' })
public products?: Product[];

// v16
products: hasMany('Product').via('store'),
```

`hasMany` columns appear in `InferSelect` as optional `Record<string, unknown>[]` to support
populate. `QueryResult` strips them from results, so they only appear after `.populate()`.
They are excluded from the insert type entirely.

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
categories: hasMany('Category')
  .through('ProductCategory')
  .via('product'),
```

### Circular references

String references avoid the circular import problem entirely. `belongsTo` and `hasMany` accept only
string model names - arrow functions are not supported:

```ts
// String references - no circular import needed
store: belongsTo('Store'),
products: hasMany('Product').via('store'),
```

Model names are resolved at `initialize()` time. All referenced models must be included in the
`models` object or array.

## Initialization

v16 uses `initialize()` with two calling styles:

```ts
// v15
import { initialize } from 'bigal';
import type { IRepository } from 'bigal';

const repos = initialize({ models: [Product, Store], pool });
const Product = repos.Product as IRepository<Product>;

// v16 -- object style (typed destructuring, recommended)
import { initialize } from 'bigal';

const { Product, Store } = initialize({
  pool,
  models: { Product, Store, Category, ProductCategory },
});
// Product is fully typed -- no assertion needed

// v16 -- array style (use getRepository)
const bigal = initialize({ pool, models: [Product, Store, Category, ProductCategory] });
const Product = bigal.getRepository(Product);
```

`initialize()` validates all relationship references at construction time. If a `belongsTo` or
`hasMany` points to a model not in the `models` object/array, it throws immediately.

### Repository type aliases

Use `Repository<typeof Product>` and `ReadonlyRepository<typeof Product>` for type annotations:

```ts
import type { Repository, ReadonlyRepository } from 'bigal';

function processProducts(repo: Repository<typeof Product>) {
  return repo.find().where({ name: { contains: 'widget' } });
}
```

### initialize options

| Option         | Type                                       | Description                                   |
| -------------- | ------------------------------------------ | --------------------------------------------- |
| `pool`         | `PoolLike`                                 | Primary connection pool                       |
| `readonlyPool` | `PoolLike`                                 | Pool for read operations (defaults to `pool`) |
| `models`       | `Record<string, TableDefinition>` or array | All table definitions                         |
| `connections`  | `Record<string, IConnection>`              | Named connections for multi-database setups   |
| `onQuery`      | `OnQueryCallback`                          | Query observability callback                  |

## Results are always plain objects

In v15, query results were class instances with prototypes. You could call `.toJSON()` to get plain
objects.

In v16, all results are plain objects. There is no `.toJSON()` method and no class wrapper.

```ts
// v15
const product = await Product.findOne().where({ id: 42 }).toJSON();

// v16
const product = await Product.findOne().where({ id: 42 });
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
payload: jsonb<IPayload>(),
```

## Type imports

```ts
// v15
import { Entity } from 'bigal';
import type { EntityStatic, QueryResult } from 'bigal';

// v16
import type { QueryResult, InferInsert, Repository } from 'bigal';

type ProductRow = QueryResult<typeof Product>;

// For repository type annotations:
function getProducts(repo: Repository<typeof Product>) {
  /* ... */
}
```

`Entity` and `EntityStatic` are no longer needed. Use `QueryResult<typeof Model>` to get the row type
(excludes hasMany, narrows FKs), and `InferInsert` for the insert type. Use `Repository<typeof Model>` and
`ReadonlyRepository<typeof Model>` for repository type annotations.

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

v16 uses the `hooks` option in `table()` with all 7 lifecycle hooks:

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
      afterCreate(result) {
        audit.log('product.created', result.id);
      },
      beforeUpdate(values) {
        return { ...values, updatedBy: getCurrentUserId() };
      },
      afterUpdate(result) {
        audit.log('product.updated', result.id);
      },
      beforeDestroy(where) {
        return where;
      },
      afterDestroy({ rowCount }) {
        audit.log('product.destroyed', rowCount);
      },
      afterFind(results) {
        return results;
      },
    },
  },
);
```

The `values` parameter is fully typed based on the schema definition.

## New features in v16

### Global filters

Automatically apply WHERE clauses to every `find` and `findOne` query:

```ts
const Product = table(
  'products',
  {
    /* columns */
  },
  {
    filters: {
      active: { isActive: true },
      notDeleted: () => ({ deletedAt: null }),
    },
  },
);

// Override per query
await Product.find().where({}).filters(false);
await Product.find().where({}).filters({ active: false });
```

### toSQL()

Inspect the generated SQL without executing on any query operation:

```ts
const { sql, params } = Product.find().where({ name: 'Widget' }).toSQL();
// sql: 'SELECT ... FROM "products" WHERE "name"=$1'
// params: ['Widget']
```

Available on `find`, `findOne`, `create`, `update`, and `destroy`.

### pgvector support

Store and query vector embeddings with `vector({ dimensions })`:

```ts
import { vector } from 'bigal';

embedding: vector({ dimensions: 1536 }),
```

Query with nearest-neighbor sort:

```ts
await repo
  .find()
  .where({})
  .sort({ embedding: { nearestTo: queryVector, metric: 'cosine' } });
```

### view()

Define read-only models backed by PostgreSQL views:

```ts
import { view } from 'bigal';

export const ProductSummary = view('product_summaries', {
  /* columns */
});
```

### String references

Relationships use string model names. Arrow functions are not supported:

```ts
store: belongsTo('Store'),
products: hasMany('Product').via('store'),
categories: hasMany('Category').through('ProductCategory').via('product'),
```

Model names are auto-derived from table names (`products` becomes `Product`).

## Logging and observability

v15 used the `DEBUG_BIGAL` environment variable:

```sh
# v15
DEBUG_BIGAL=true node app.js
```

v16 adds a structured `onQuery` callback:

```ts
// v16
const { Product } = initialize({
  pool,
  models: { Product, Store },
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

- `Entity`, `EntityStatic` - no base class needed
- `NotEntity`, `NotEntityBrand` - structural typing workaround no longer needed
- `@table()`, `@column()`, `@primaryColumn()`, `@createDateColumn()`, `@updateDateColumn()`,
  `@versionColumn()` decorators
- `.toJSON()` on query results - results are already plain objects
- `FindResultJSON`, `FindOneResultJSON`, `CreateResultJSON`, `UpdateResultJSON`, `DestroyResultJSON`

## Query API is unchanged

The fluent query builder API is identical in v16. All of these work exactly as before:

```ts
// find with where, sort, limit
const products = await Product.find()
  .where({ name: { contains: 'widget' } })
  .sort('name')
  .limit(10);

// findOne with populate
const product = await Product.findOne().where({ id: 42 }).populate('store');

// count
const count = await Product.count().where({ isActive: true });

// create
const newProduct = await Product.create({ name: 'Widget', priceCents: 999, store: 1 });

// update
const updated = await Product.update({ id: 42 }, { name: 'Super Widget' });

// destroy
await Product.destroy({ id: 42 });

// upsert
await Product.create({ name: 'Widget', sku: 'WDG-001', priceCents: 999 }, { onConflict: { action: 'merge', targets: ['sku'], merge: ['priceCents'] } });
```

## Migration checklist

1. Update Node.js to v22 or later
2. Remove `experimentalDecorators` and `useDefineForClassFields` from `tsconfig.json`
3. Convert each model class to a `table()` call with no-arg column builders
4. Replace `extends Entity` / abstract base classes with shared column objects using spread
5. Replace `@column({ model: ... })` with `belongsTo('ModelName')`
6. Replace `@column({ collection: ... })` with `hasMany('ModelName')`
7. Update `initialize()` call to use object-style models for typed destructuring
8. Remove `NotEntity<T>` wrappers from JSON column types
9. Remove `.toJSON()` calls from queries
10. Replace `Entity` / `EntityStatic` type imports with `InferSelect` / `InferInsert`
11. Replace `Repository<T>` type assertions with `Repository<typeof Model>`
12. Replace static lifecycle hooks with `hooks` option in `table()`
13. Replace `DEBUG_BIGAL` usage with `onQuery` callback (optional - env var still works)
