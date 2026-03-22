---
name: upgrading-bigal-v16
description: Migrates BigAl projects from v15 decorator-based models to v16 function-based table() API. Use when upgrading BigAl, converting decorator models, or migrating from class-based Entity models to the new schema API.
---

# Upgrading to BigAl v16

## Quick Start

v16 replaces decorators with function-based schema definitions. No classes,
no `experimentalDecorators`, no `extends Entity`.

**Before (v15):**

```typescript
import { column, primaryColumn, table, Entity, initialize } from 'bigal';

@table({ name: 'products' })
class Product extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({ type: 'string', required: true })
  public name!: string;

  @column({ model: 'Store', name: 'store_id' })
  public store!: Store | number;
}

const repos = initialize({ models: [Product, Store], pool });
const Product = repos.Product as Repository<Product>;
```

**After (v16):**

```typescript
import { defineTable as table, serial, text, belongsTo, initialize } from 'bigal';
import type { Repository } from 'bigal';

const Product = table('products', {
  id: serial().primaryKey(),
  name: text().notNull(),
  store: belongsTo('Store'),
});

const { Product } = initialize({ pool, models: { Product, Store } });
// Product is Repository<typeof Product> -- fully typed, no assertion needed
```

## Migration Steps

### Step 1: Convert model files

For each model class, create a `table()` call:

| v15 Decorator                                             | v16 Builder                             |
| --------------------------------------------------------- | --------------------------------------- |
| `@primaryColumn({ type: 'integer' })`                     | `serial().primaryKey()`                 |
| `@column({ type: 'string', required: true })`             | `text().notNull()`                      |
| `@column({ type: 'string' })`                             | `text()`                                |
| `@column({ type: 'integer' })`                            | `integer()`                             |
| `@column({ type: 'float' })`                              | `real()`                                |
| `@column({ type: 'boolean' })`                            | `boolean()`                             |
| `@column({ type: 'json' })`                               | `jsonb()`                               |
| `@column({ type: 'datetime' })`                           | `timestamptz()`                         |
| `@column({ type: 'date' })`                               | `date()`                                |
| `@column({ type: 'uuid' })`                               | `uuid()`                                |
| `@column({ type: 'binary' })`                             | `bytea()`                               |
| `@column({ type: 'string[]' })`                           | `textArray()`                           |
| `@column({ type: 'integer[]' })`                          | `integerArray()`                        |
| `@column({ type: 'boolean[]' })`                          | `booleanArray()`                        |
| `@createDateColumn()`                                     | `createdAt()`                           |
| `@updateDateColumn()`                                     | `updatedAt()`                           |
| `@versionColumn()`                                        | `integer().notNull()`                   |
| `@column({ model: 'Store', name: 'store_id' })`           | `belongsTo('Store')`                    |
| `@column({ collection: 'Product', via: 'store' })`        | `hasMany('Product').via('store')`       |
| `@column({ collection: 'Cat', through: 'PC', via: 'p' })` | `hasMany('Cat').through('PC').via('p')` |

Column names auto-derive from property keys via snakeCase. Only specify
a name when the convention doesn't match:

```typescript
aliases: textArray({ name: 'alias_names' }).default([]),
```

### Step 2: Extract shared base columns

Replace class inheritance with object spread:

```typescript
// Before
abstract class ModelBase extends Entity {
  @primaryColumn({ type: 'integer' }) public id!: number;
}
class Product extends ModelBase { ... }

// After
const modelBase = { id: serial().primaryKey() };
const timestamps = { createdAt: createdAt(), updatedAt: updatedAt() };

const Product = table('products', {
  ...modelBase,
  ...timestamps,
  name: text().notNull(),
});
```

### Step 3: Convert hooks

Move static `beforeCreate`/`beforeUpdate` methods to table options.
v16 supports all 7 lifecycle hooks:

```typescript
// Before
class Product extends Entity {
  static override beforeCreate(values) {
    return { ...values, slug: slugify(values.name) };
  }
}

// After
const Product = table(
  'products',
  { ...columns },
  {
    hooks: {
      beforeCreate(values) {
        return { ...values, slug: slugify(values.name) };
      },
    },
  },
);
```

Available hooks: `beforeCreate`, `afterCreate`, `beforeUpdate`,
`afterUpdate`, `beforeDestroy`, `afterDestroy`, `afterFind`.

### Step 4: Convert initialization

```typescript
// Before
const repos = initialize({ models: [Product, Store], pool });
const Product = repos.Product as Repository<Product>;

// After -- object style (typed destructuring, recommended)
const { Product, Store } = initialize({
  pool,
  models: { Product, Store },
});

// After -- array style (use getRepository)
const bigal = initialize({ pool, models: [Product, Store] });
const Product = bigal.getRepository(Product);
```

### Step 5: Remove old imports and config

- Remove `extends Entity` from all classes
- Remove `import { Entity, column, primaryColumn, ... } from 'bigal'`
- Remove `experimentalDecorators: true` from tsconfig.json
- Remove `useDefineForClassFields: false` from tsconfig.json
- Remove `.toJSON()` calls -- results are always plain objects
- Remove `NotEntity<T>` wrappers -- no longer needed

### Step 6: Update type references

```typescript
// Before
let product: Product;
let params: CreateUpdateParams<Product>;

// After -- types inferred from table definition
import type { InferSelect, InferInsert, Repository } from 'bigal';

type ProductRow = InferSelect<(typeof Product)['schema']>;
type ProductInsert = InferInsert<(typeof Product)['schema']>;

// For repository type annotations:
function getProducts(repo: Repository<typeof Product>) {
  /* ... */
}
```

## Removed Exports

These v15 exports no longer exist:

- `Entity`, `EntityStatic`, `NotEntity`, `NotEntityBrand`
- `column`, `primaryColumn`, `createDateColumn`, `updateDateColumn`,
  `versionColumn` (decorators)
- `table` decorator (replaced by `table` function, exported as
  `defineTable`)
- `getMetadataStorage`, `MetadataStorage`

## New Features in v16

- `view()` -- define readonly models backed by PostgreSQL views
- `toSQL()` -- inspect generated SQL without executing on any operation
- `onQuery` -- observability callback on `initialize()`
- Global filters -- auto-applied where clauses (soft delete,
  multi-tenancy)
- All 7 lifecycle hooks -- `beforeCreate`, `afterCreate`,
  `beforeUpdate`, `afterUpdate`, `beforeDestroy`, `afterDestroy`,
  `afterFind`
- String references -- `belongsTo('Store')` instead of arrow functions
- Auto-derived names -- column names from property keys, model names
  from table names
- pgvector -- `vector({ dimensions })` with nearest-neighbor sort and
  distance filtering
- `Repository<typeof Product>` -- type alias for typed repository
  annotations

## Guidelines

- Run the codemod first for mechanical conversions:
  `npx tsx scripts/migrate-v16.ts 'src/models/**/*.ts'`
- Convert one model at a time and verify tests pass
- Instance methods on Entity classes should become `afterFind` hooks or
  standalone functions
- The query API (`find`, `findOne`, `create`, `update`, `destroy`,
  `populate`, `where`, `sort`) is unchanged
