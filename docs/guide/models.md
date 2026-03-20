---
description: Define PostgreSQL tables with the table() function and PostgreSQL-native column builders for type-safe schema definitions.
---

# Models

Models define the shape of your PostgreSQL tables. Each model is created with the `table()` function and
a set of column builders that map directly to PostgreSQL column types. Types are inferred from the schema
definition -- no separate interfaces required.

## Defining a table

Use `table()` (exported as `defineTable` from `'bigal'`) to create a table definition:

```ts
import { defineTable as table, serial, text, integer, boolean, createdAt, updatedAt } from 'bigal';

export const Product = table('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  priceCents: integer('price_cents').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
```

The first argument is the database table name. The second is an object mapping property names to column
builders. Each column builder takes the database column name as its first argument.

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

| Option       | Type      | Description                                           |
| ------------ | --------- | ----------------------------------------------------- |
| `schema`     | `string`  | PostgreSQL schema (default: `public`)                 |
| `readonly`   | `boolean` | If `true`, `getRepository()` returns read-only access |
| `connection` | `string`  | Named connection key (for multi-database setups)      |

## Column types

Each builder maps to a PostgreSQL column type. All columns are nullable by default -- use `.notNull()`
to make them required.

### String types

```ts
import { text, varchar, uuid } from 'bigal';

name: text('name'),                       // TEXT -- string | null
sku: varchar('sku', { length: 100 }),      // VARCHAR(100) -- string | null
externalId: uuid('external_id'),           // UUID -- string | null
```

### Numeric types

```ts
import { serial, bigserial, integer, bigint, smallint, real, doublePrecision } from 'bigal';

id: serial('id').primaryKey(),             // SERIAL -- number (notNull + default implied)
bigId: bigserial('big_id'),                // BIGSERIAL -- number (notNull + default implied)
quantity: integer('quantity'),              // INTEGER -- number | null
views: bigint('views'),                    // BIGINT -- number | null
rank: smallint('rank'),                    // SMALLINT -- number | null
score: real('score'),                      // REAL -- number | null
precise: doublePrecision('precise'),       // DOUBLE PRECISION -- number | null
```

`serial()` and `bigserial()` automatically imply `.notNull()` and `.default()`. They are always
`number` on select and optional on insert.

### Boolean

```ts
import { boolean } from 'bigal';

isActive: boolean('is_active'),                         // BOOLEAN -- boolean | null
isPublished: boolean('is_published').notNull(),          // BOOLEAN -- boolean
isArchived: boolean('is_archived').notNull().default(false), // BOOLEAN -- boolean (optional on insert)
```

### Date and time

```ts
import { date, timestamp, timestamptz, createdAt, updatedAt } from 'bigal';

birthDate: date('birth_date'),             // DATE -- Date | null
occurredAt: timestamp('occurred_at'),      // TIMESTAMP -- Date | null
scheduledFor: timestamptz('scheduled_for'), // TIMESTAMPTZ -- Date | null
createdAt: createdAt(),                    // TIMESTAMPTZ -- Date (notNull, auto-set on insert)
updatedAt: updatedAt(),                    // TIMESTAMPTZ -- Date (notNull, auto-set on insert/update)
```

`createdAt()` and `updatedAt()` default to column names `created_at` and `updated_at`. Pass a custom
name if needed: `createdAt('creation_time')`.

### JSON

```ts
import { json, jsonb } from 'bigal';

settings: json<{ theme: string }>('settings'),           // JSON -- { theme: string } | null
metadata: jsonb<{ color?: string }>('metadata'),          // JSONB -- { color?: string } | null
```

The generic parameter controls the TypeScript type. If omitted, it defaults to
`Record<string, unknown>`.

### Binary

```ts
import { bytea } from 'bigal';

data: bytea('data'),                       // BYTEA -- Buffer | null
```

### Array types

```ts
import { textArray, integerArray, booleanArray } from 'bigal';

tags: textArray('tags'),                   // TEXT[] -- string[] | null
scores: integerArray('scores'),            // INTEGER[] -- number[] | null
flags: booleanArray('flags'),              // BOOLEAN[] -- boolean[] | null
```

## Column modifiers

Chain methods on any column builder to set constraints. Each method returns the builder, so chains
compose naturally.

### .notNull()

Removes `null` from the TypeScript type. Maps to a `NOT NULL` constraint.

```ts
name: text('name').notNull(),   // string (not string | null)
```

### .default(value)

Makes the column optional on insert. The value is used as the TypeScript default hint.

```ts
isActive: boolean('is_active').notNull().default(true),  // boolean, optional on insert
aliases: textArray('aliases').default([]),                // string[] | null, optional on insert
```

### .primaryKey()

Marks the column as the primary key. Implies `.notNull()` and makes the column optional on insert
(the database assigns the value).

```ts
id: serial('id').primaryKey(),             // number, optional on insert
id: uuid('id').primaryKey(),               // string, optional on insert
```

### .unique()

Adds a UNIQUE constraint. No effect on the TypeScript type.

```ts
email: text('email').notNull().unique(),   // string, must be unique
```

### Chaining

Modifiers compose in any order:

```ts
email: text('email').notNull().unique(),
isActive: boolean('is_active').notNull().default(true),
score: integer('score').default(0),
```

## Complete column reference

| Builder                     | PostgreSQL type  | TypeScript type     | Notes                                 |
| --------------------------- | ---------------- | ------------------- | ------------------------------------- |
| `serial(name)`              | SERIAL           | `number`            | notNull + default implied             |
| `bigserial(name)`           | BIGSERIAL        | `number`            | notNull + default implied             |
| `text(name)`                | TEXT             | `string \| null`    |                                       |
| `varchar(name, { length })` | VARCHAR(n)       | `string \| null`    |                                       |
| `integer(name)`             | INTEGER          | `number \| null`    |                                       |
| `bigint(name)`              | BIGINT           | `number \| null`    |                                       |
| `smallint(name)`            | SMALLINT         | `number \| null`    |                                       |
| `real(name)`                | REAL             | `number \| null`    |                                       |
| `doublePrecision(name)`     | DOUBLE PRECISION | `number \| null`    |                                       |
| `boolean(name)`             | BOOLEAN          | `boolean \| null`   |                                       |
| `timestamp(name)`           | TIMESTAMP        | `Date \| null`      |                                       |
| `timestamptz(name)`         | TIMESTAMPTZ      | `Date \| null`      |                                       |
| `date(name)`                | DATE             | `Date \| null`      |                                       |
| `json<T>(name)`             | JSON             | `T \| null`         | Defaults to `Record<string, unknown>` |
| `jsonb<T>(name)`            | JSONB            | `T \| null`         | Defaults to `Record<string, unknown>` |
| `uuid(name)`                | UUID             | `string \| null`    |                                       |
| `bytea(name)`               | BYTEA            | `Buffer \| null`    |                                       |
| `textArray(name)`           | TEXT[]           | `string[] \| null`  |                                       |
| `integerArray(name)`        | INTEGER[]        | `number[] \| null`  |                                       |
| `booleanArray(name)`        | BOOLEAN[]        | `boolean[] \| null` |                                       |
| `createdAt(name?)`          | TIMESTAMPTZ      | `Date`              | notNull, auto-set on insert           |
| `updatedAt(name?)`          | TIMESTAMPTZ      | `Date`              | notNull, auto-set on insert/update    |

## Relationships

### Many-to-one (belongsTo)

Use `belongsTo` when this table holds the foreign key:

```ts
import { belongsTo } from 'bigal';

store: belongsTo(() => Store, 'store_id'),
```

The first argument is an arrow function returning the related table definition. The second is the
database column name for the foreign key.

In `$inferSelect`, a `belongsTo` column is typed as the FK value (typically `number`). After
`.populate('store')`, the type changes to the full related entity.

### One-to-many (hasMany)

Use `hasMany` for the inverse side of a relationship:

```ts
import { hasMany } from 'bigal';

products: hasMany(() => Product).via('store'),
```

`.via()` specifies the property name on the related table that holds the foreign key back to this
table.

### Many-to-many (hasMany with through)

Use `.through()` for relationships via a junction table:

```ts
categories: hasMany(() => Category)
  .through(() => ProductCategory)
  .via('product'),
```

`hasMany` columns are excluded from both `$inferSelect` and `$inferInsert`. They are only present
after `.populate()`.

See [Relationships](/guide/relationships) for complete examples.

## Shared columns

Define reusable column sets as plain objects and spread them into schema definitions:

```ts
const modelBase = {
  id: serial('id').primaryKey(),
};

const timestamps = {
  createdAt: createdAt(),
  updatedAt: updatedAt(),
};

export const Product = table('products', {
  ...modelBase,
  ...timestamps,
  name: text('name').notNull(),
});

export const Store = table('stores', {
  ...modelBase,
  ...timestamps,
  name: text('name'),
});
```

## Type inference

Every table definition exposes `$inferSelect` and `$inferInsert` phantom types:

```ts
// The row type returned by find/findOne/create/update
type ProductRow = typeof Product.$inferSelect;
// { id: number; name: string; priceCents: number; isActive: boolean;
//   metadata: { color?: string } | null; createdAt: Date; updatedAt: Date }

// The insert type accepted by create()
type ProductInsert = typeof Product.$inferInsert;
// { name: string; priceCents: number;           <-- required
//   id?: number; isActive?: boolean;             <-- optional (has default or primary key)
//   metadata?: { color?: string } | null; }      <-- optional (nullable)
```

You can also use the `InferSelect` and `InferInsert` utility types if you have the schema object:

```ts
import type { InferSelect, InferInsert } from 'bigal';

type ProductRow = InferSelect<typeof productSchema>;
type ProductInsert = InferInsert<typeof productSchema>;
```

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

Define lifecycle hooks as the third argument to `table()`:

```ts
export const Product = table(
  'products',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
  },
  {
    hooks: {
      beforeCreate(values) {
        return { ...values, slug: slugify(values.name) };
      },
      beforeUpdate(values) {
        if (values.name) {
          return { ...values, slug: slugify(values.name) };
        }
        return values;
      },
    },
  },
);
```

| Hook           | Called          | Receives              | Returns                |
| -------------- | --------------- | --------------------- | ---------------------- |
| `beforeCreate` | Before `INSERT` | Insert values         | Modified insert values |
| `beforeUpdate` | Before `UPDATE` | Partial update values | Modified update values |

Hook parameters are fully typed based on the schema definition.
