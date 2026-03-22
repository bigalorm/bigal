---
description: Define models with the table() function and PostgreSQL-native column builders for type-safe schema definitions.
---

# Models

Models define the shape of your PostgreSQL tables. Each model is created with the `table()` function and
a set of column builders that map directly to PostgreSQL column types. Types are inferred from the schema
definition - no separate interfaces required.

## Defining a model

Use `table()` (exported as `defineTable` from `'bigal'`) to create a model:

```ts
import { defineTable as table, serial, text, integer, boolean, createdAt, updatedAt } from 'bigal';

export const Product = table('products', {
  id: serial().primaryKey(),
  name: text().notNull(),
  priceCents: integer().notNull(),
  isActive: boolean().notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
```

The first argument is the database table name. The second is an object mapping property names to column
builders. Column builders take no arguments by default - the database column name is auto-derived from
the property key using snakeCase (e.g., `priceCents` becomes `price_cents`).

### Auto-derived names

BigAl automatically derives two names from your definitions:

- **Column names** - property keys are converted to snake_case for the database column name.
  `priceCents` becomes `price_cents`, `isActive` becomes `is_active`.
- **Model names** - the table name is singularized and PascalCased for relationship lookups.
  `products` becomes `Product`, `product__category` becomes `ProductCategory`.

Override either when the convention does not match:

```ts
// Override column name
aliases: textArray({ name: 'alias_names' }).default([]),

// Override model name
const Product = table('items', { /* ... */ }, { modelName: 'Product' });
```

### Table options

Pass a third argument for additional options:

```ts
const AuditLog = table(
  'audit_logs',
  {
    /* columns */
  },
  {
    schema: 'audit',
    readonly: true,
    connection: 'audit',
  },
);
```

| Option       | Type      | Description                                              |
| ------------ | --------- | -------------------------------------------------------- |
| `schema`     | `string`  | PostgreSQL schema (default: `public`)                    |
| `readonly`   | `boolean` | If `true`, `initialize()` returns a read-only repository |
| `connection` | `string`  | Named connection key (for multi-database setups)         |
| `modelName`  | `string`  | Override auto-derived model name                         |
| `hooks`      | `object`  | Lifecycle hooks (see [Hooks](#hooks))                    |
| `filters`    | `object`  | Global filters (see [Global filters](#global-filters))   |

## Column types

Each builder maps to a PostgreSQL column type. All columns are nullable by default - use `.notNull()`
to make them required. Column builders take no arguments; pass `{ name: 'custom_name' }` only when the
auto-derived snake_case name does not match your database column.

### String types

```ts
import { text, varchar, uuid } from 'bigal';

name: text(),                                 // TEXT -- string | null
sku: varchar({ length: 100 }),                // VARCHAR(100) -- string | null
externalId: uuid(),                           // UUID -- string | null
```

### Numeric types

```ts
import { serial, bigserial, integer, bigint, smallint, real, doublePrecision } from 'bigal';

id: serial().primaryKey(),                    // SERIAL -- number (notNull + default implied)
bigId: bigserial(),                           // BIGSERIAL -- number (notNull + default implied)
quantity: integer(),                          // INTEGER -- number | null
views: bigint(),                              // BIGINT -- number | null
rank: smallint(),                             // SMALLINT -- number | null
score: real(),                                // REAL -- number | null
precise: doublePrecision(),                   // DOUBLE PRECISION -- number | null
```

`serial()` and `bigserial()` automatically imply `.notNull()` and `.default()`. They are always
`number` on select and optional on insert.

### Boolean

```ts
import { boolean } from 'bigal';

isActive: boolean(),                                       // BOOLEAN -- boolean | null
isPublished: boolean().notNull(),                          // BOOLEAN -- boolean
isArchived: boolean().notNull().default(false),            // BOOLEAN -- boolean (optional on insert)
```

### Date and time

```ts
import { date, timestamp, timestamptz, createdAt, updatedAt } from 'bigal';

birthDate: date(),                            // DATE -- Date | null
occurredAt: timestamp(),                      // TIMESTAMP -- Date | null
scheduledFor: timestamptz(),                  // TIMESTAMPTZ -- Date | null
createdAt: createdAt(),                       // TIMESTAMPTZ -- Date (notNull, auto-set on insert)
updatedAt: updatedAt(),                       // TIMESTAMPTZ -- Date (notNull, auto-set on insert/update)
```

`createdAt()` and `updatedAt()` default to column names `created_at` and `updated_at`. Pass a custom
name if needed: `createdAt({ name: 'creation_time' })`.

### JSON

```ts
import { json, jsonb } from 'bigal';

settings: json<{ theme: string }>(),                      // JSON -- { theme: string } | null
metadata: jsonb<{ color?: string }>(),                     // JSONB -- { color?: string } | null
```

The generic parameter controls the TypeScript type. If omitted, it defaults to
`Record<string, unknown>`.

### Binary

```ts
import { bytea } from 'bigal';

data: bytea(),                                // BYTEA -- Buffer | null
```

### Array types

```ts
import { textArray, integerArray, booleanArray } from 'bigal';

tags: textArray(),                            // TEXT[] -- string[] | null
scores: integerArray(),                       // INTEGER[] -- number[] | null
flags: booleanArray(),                        // BOOLEAN[] -- boolean[] | null
```

### Vector (pgvector)

```ts
import { vector } from 'bigal';

embedding: vector({ dimensions: 1536 }),      // VECTOR(1536) -- number[] | null
```

The `dimensions` option is required. See [Querying > Vector distance](/guide/querying#vector-distance-queries)
for sorting and filtering by similarity.

## Column modifiers

Chain methods on any column builder to set constraints. Each method returns the builder, so chains
compose naturally.

### .notNull()

Removes `null` from the TypeScript type. Maps to a `NOT NULL` constraint.

```ts
name: text().notNull(),   // string (not string | null)
```

### .default(value)

Makes the column optional on insert. The value is used as the TypeScript default hint.

```ts
isActive: boolean().notNull().default(true),               // boolean, optional on insert
aliases: textArray().default([]),                           // string[] | null, optional on insert
```

### .primaryKey()

Marks the column as the primary key. Implies `.notNull()` and makes the column optional on insert
(the database assigns the value).

```ts
id: serial().primaryKey(),                    // number, optional on insert
id: uuid().primaryKey(),                      // string, optional on insert
```

### .unique()

Adds a UNIQUE constraint. No effect on the TypeScript type.

```ts
email: text().notNull().unique(),             // string, must be unique
```

### Chaining

Modifiers compose in any order:

```ts
email: text().notNull().unique(),
isActive: boolean().notNull().default(true),
score: integer().default(0),
```

## Complete column reference

| Builder                  | PostgreSQL type  | TypeScript type     | Notes                                 |
| ------------------------ | ---------------- | ------------------- | ------------------------------------- |
| `serial()`               | SERIAL           | `number`            | notNull + default implied             |
| `bigserial()`            | BIGSERIAL        | `number`            | notNull + default implied             |
| `text()`                 | TEXT             | `string \| null`    |                                       |
| `varchar({ length })`    | VARCHAR(n)       | `string \| null`    |                                       |
| `integer()`              | INTEGER          | `number \| null`    |                                       |
| `bigint()`               | BIGINT           | `number \| null`    |                                       |
| `smallint()`             | SMALLINT         | `number \| null`    |                                       |
| `real()`                 | REAL             | `number \| null`    |                                       |
| `doublePrecision()`      | DOUBLE PRECISION | `number \| null`    |                                       |
| `boolean()`              | BOOLEAN          | `boolean \| null`   |                                       |
| `timestamp()`            | TIMESTAMP        | `Date \| null`      |                                       |
| `timestamptz()`          | TIMESTAMPTZ      | `Date \| null`      |                                       |
| `date()`                 | DATE             | `Date \| null`      |                                       |
| `json<T>()`              | JSON             | `T \| null`         | Defaults to `Record<string, unknown>` |
| `jsonb<T>()`             | JSONB            | `T \| null`         | Defaults to `Record<string, unknown>` |
| `uuid()`                 | UUID             | `string \| null`    |                                       |
| `bytea()`                | BYTEA            | `Buffer \| null`    |                                       |
| `textArray()`            | TEXT[]           | `string[] \| null`  |                                       |
| `integerArray()`         | INTEGER[]        | `number[] \| null`  |                                       |
| `booleanArray()`         | BOOLEAN[]        | `boolean[] \| null` |                                       |
| `vector({ dimensions })` | VECTOR(n)        | `number[] \| null`  | Requires pgvector extension           |
| `createdAt()`            | TIMESTAMPTZ      | `Date`              | notNull, auto-set on insert           |
| `updatedAt()`            | TIMESTAMPTZ      | `Date`              | notNull, auto-set on insert/update    |

## Relationships

### Many-to-one (belongsTo)

Use `belongsTo` when this table holds the foreign key:

```ts
import { belongsTo } from 'bigal';

store: belongsTo('Store'),
```

The argument is the model name of the related table. The FK column name is auto-derived as
`snakeCase(propertyKey) + '_id'` (e.g., `store` becomes `store_id`).

Override the FK column name when the convention does not match:

```ts
store: belongsTo('Store', { name: 'shop_id' }),
```

In the inferred select type, a `belongsTo` column is typed as the FK value (typically `number`). After
`.populate('store')`, the type changes to the full related entity.

### One-to-many (hasMany)

Use `hasMany` for the inverse side of a relationship:

```ts
import { hasMany } from 'bigal';

products: hasMany('Product').via('store'),
```

`.via()` specifies the property name on the related table that holds the foreign key back to this
table.

### Many-to-many (hasMany with through)

Use `.through()` for relationships via a junction table:

```ts
categories: hasMany('Category')
  .through('ProductCategory')
  .via('product'),
```

`hasMany` columns are excluded from both the select and insert types. They are only present
after `.populate()`.

See [Relationships](/guide/relationships) for complete examples.

## Shared columns

Define reusable column sets as plain objects and spread them into schema definitions:

```ts
const modelBase = {
  id: serial().primaryKey(),
};

const timestamps = {
  createdAt: createdAt(),
  updatedAt: updatedAt(),
};

export const Product = table('products', {
  ...modelBase,
  ...timestamps,
  name: text().notNull(),
});

export const Store = table('stores', {
  ...modelBase,
  ...timestamps,
  name: text(),
});
```

## Type inference

Use the `InferSelect` and `InferInsert` utility types to extract row and insert types from a table
definition's schema:

```ts
import type { InferSelect, InferInsert } from 'bigal';

type ProductRow = InferSelect<(typeof Product)['schema']>;
// { id: number; name: string; priceCents: number; isActive: boolean;
//   metadata: { color?: string } | null; createdAt: Date; updatedAt: Date }

type ProductInsert = InferInsert<(typeof Product)['schema']>;
// { name: string; priceCents: number;           <-- required
//   id?: number; isActive?: boolean;             <-- optional (has default or primary key)
//   metadata?: { color?: string } | null; }      <-- optional (nullable)
```

### Repository and ReadonlyRepository type aliases

When you need to annotate a function parameter or variable with a repository type, use the
`Repository` and `ReadonlyRepository` type aliases:

```ts
import type { Repository, ReadonlyRepository } from 'bigal';

function processProducts(repo: Repository<typeof Product>) {
  return repo.find().where({ name: { contains: 'widget' } });
}

function readSummary(repo: ReadonlyRepository<typeof StoreSummary>) {
  return repo.findOne().where({ id: 1 });
}
```

These accept `typeof YourTableDef` and resolve to the correctly typed `IRepository` or
`IReadonlyRepository`.

### Insert type rules

Columns are **required** on insert when they are `.notNull()` and have no default, are not a primary
key, and are not auto-set.

Columns are **optional** on insert when any of the following is true:

- Nullable (no `.notNull()`)
- Has a `.default()` value
- Is a `.primaryKey()`
- Is auto-set (`createdAt()`, `updatedAt()`)

`hasMany` columns are excluded from the insert type entirely.

## Hooks

Define lifecycle hooks in the third argument to `table()`:

```ts
export const Product = table(
  'products',
  {
    id: serial().primaryKey(),
    name: text().notNull(),
    slug: text().notNull(),
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
        if (values.name) {
          return { ...values, slug: slugify(values.name) };
        }
        return values;
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

| Hook            | Called          | Receives               | Returns                |
| --------------- | --------------- | ---------------------- | ---------------------- |
| `beforeCreate`  | Before `INSERT` | Insert values          | Modified insert values |
| `afterCreate`   | After `INSERT`  | Created record         | void                   |
| `beforeUpdate`  | Before `UPDATE` | Partial update values  | Modified update values |
| `afterUpdate`   | After `UPDATE`  | Updated record         | void                   |
| `beforeDestroy` | Before `DELETE` | Where clause object    | Modified where clause  |
| `afterDestroy`  | After `DELETE`  | `{ rowCount: number }` | void                   |
| `afterFind`     | After `SELECT`  | Array of results       | Modified results array |

All hook parameters are fully typed based on the schema definition. Hooks can be synchronous or
return a Promise.

## Global filters

Define named filters that are automatically applied to every `find` and `findOne` query:

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
```

Filters can be static objects or functions that return a where clause dynamically. They are merged
into every query's WHERE clause.

Override filters per query:

```ts
// Disable all filters
await Product.find().where({}).filters(false);

// Disable a specific filter
await Product.find().where({}).filters({ active: false });
```

See [Querying > Global filters](/guide/querying#global-filters) for more details.
