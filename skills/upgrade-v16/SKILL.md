---
name: upgrading-bigal-v16
description: Migrates BigAl projects from v15 decorator-based models to v16 function-based table() API. Use when upgrading BigAl, converting decorator models, or migrating from class-based Entity models to the new schema API.
---

# Upgrading to BigAl v16

## Instructions

Follow these steps in order. Run the codemod first for mechanical
conversions, then review and fix up the output.

### Step 1: Run the codemod

Find all decorator-based model files and run the codemod on them:

```bash
npx tsx node_modules/bigal/scripts/migrate-v16.ts 'src/models/**/*.ts'
```

Review the dry-run output. If it looks correct, apply the changes:

```bash
npx tsx node_modules/bigal/scripts/migrate-v16.ts 'src/models/**/*.ts' --write
```

The codemod handles:

- `@table` + `@column` decorators → `table()` with column builders
- `@primaryColumn` → `serial().primaryKey()` or `integer().primaryKey()`
- `@createDateColumn` / `@updateDateColumn` → `createdAt()` / `updatedAt()`
- `@column({ model: 'Store' })` → `belongsTo('Store')`
- `@column({ collection: ..., via: ... })` → `hasMany('...').via('...')`
- `@column({ collection: ..., through: ..., via: ... })` → `hasMany('...').through('...').via('...')`
- Readonly tables → `view()` instead of `table()` with readonly option

The codemod does NOT handle:

- Base class extraction (you must create shared column objects manually)
- Lifecycle hooks (marked with TODO comments)
- Instance methods (marked with TODO comments)
- Complex inheritance hierarchies

### Step 2: Extract shared base columns

If your models extended a base class, create shared column objects:

```typescript
// base.ts
import { serial, createdAt, updatedAt } from 'bigal';

export const modelBase = { id: serial().primaryKey() };
export const timestamps = { createdAt: createdAt(), updatedAt: updatedAt() };
```

Then spread into each model:

```typescript
import { table, text, belongsTo } from 'bigal';
import { modelBase, timestamps } from './base';

export const Product = table('products', {
  ...modelBase,
  ...timestamps,
  name: text().notNull(),
  store: belongsTo('Store'),
});
```

### Step 3: Migrate lifecycle hooks

Move static `beforeCreate`/`beforeUpdate` methods to table options:

```typescript
export const Product = table(
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

Instance methods should become `afterFind` hooks or standalone functions.

### Step 4: Update initialization

```typescript
// Before
const repos = initialize({ models: [Product, Store], pool });
const ProductRepo = repos.Product as Repository<Product>;

// After — object style with typed destructuring
const { Product: ProductRepo, Store: StoreRepo } = initialize({
  pool,
  models: { Product, Store },
});
```

### Step 5: Update type references

```typescript
// Before
let repo: Repository<Product>;

// After
import type { Repository } from 'bigal';
let repo: Repository<typeof Product>;
```

### Step 6: Clean up

- Remove `experimentalDecorators: true` from tsconfig.json
- Remove `useDefineForClassFields: false` from tsconfig.json
- Remove `.toJSON()` calls — results are always plain objects
- Remove `NotEntity<T>` wrappers — no longer needed
- Remove `import { Entity }` — no longer exists

### Step 7: Verify

```bash
npm run build
npm test
```

## Column type mapping reference

| v15 Decorator                                 | v16 Builder             |
| --------------------------------------------- | ----------------------- |
| `@primaryColumn({ type: 'integer' })`         | `serial().primaryKey()` |
| `@column({ type: 'string', required: true })` | `text().notNull()`      |
| `@column({ type: 'string' })`                 | `text()`                |
| `@column({ type: 'integer' })`                | `integer()`             |
| `@column({ type: 'float' })`                  | `real()`                |
| `@column({ type: 'boolean' })`                | `boolean()`             |
| `@column({ type: 'json' })`                   | `jsonb()`               |
| `@column({ type: 'datetime' })`               | `timestamptz()`         |
| `@column({ type: 'date' })`                   | `date()`                |
| `@column({ type: 'uuid' })`                   | `uuid()`                |
| `@column({ type: 'binary' })`                 | `bytea()`               |
| `@column({ type: 'string[]' })`               | `textArray()`           |
| `@column({ type: 'integer[]' })`              | `integerArray()`        |
| `@column({ type: 'boolean[]' })`              | `booleanArray()`        |
| `@createDateColumn()`                         | `createdAt()`           |
| `@updateDateColumn()`                         | `updatedAt()`           |

Column names auto-derive from property keys via snakeCase. Only
specify a name when the convention doesn't match:

```typescript
aliases: textArray({ name: 'alias_names' }).default([]),
```

## New features in v16

- `Repository<typeof Product>` / `ReadonlyRepository<typeof Product>` type aliases
- `view()` for readonly PostgreSQL views
- `toSQL()` on find, findOne, create, update, destroy
- `onQuery` observability callback
- Global filters with per-query override
- `afterFind` hook for result transformation
- String references for relationships
- pgvector support: `vector({ dimensions })` with distance queries
