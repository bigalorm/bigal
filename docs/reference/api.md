---
description: Complete API reference for BigAl - initialize(), table(), column builders, relationships, repository methods, query builder, and types.
---

# API Reference

All public exports from `bigal`.

## initialize()

Creates a BigAl instance with typed repositories for all provided models.

### Object-style models (recommended)

Returns typed repositories directly via destructuring:

```ts
import { initialize } from 'bigal';

const { Product, Store } = initialize({
  pool,
  readonlyPool,
  models: { Product, Store, Category, ProductCategory },
  connections: {
    audit: { pool: auditPool },
  },
  onQuery({ sql, params, duration, error, model, operation }) {
    logger.debug({ sql, params, duration, model, operation });
  },
});
```

### Array-style models

Returns an object with `getRepository()` and `getReadonlyRepository()` methods:

```ts
const bigal = initialize({
  pool,
  models: [Product, Store, Category, ProductCategory],
});

const Product = bigal.getRepository(Product);
```

**Parameters:**

| Option         | Type                                       | Required | Description                                   |
| -------------- | ------------------------------------------ | -------- | --------------------------------------------- |
| `pool`         | `PoolLike`                                 | Yes      | Primary connection pool                       |
| `readonlyPool` | `PoolLike`                                 | No       | Pool for read operations (defaults to `pool`) |
| `models`       | `Record<string, TableDefinition>` or array | Yes      | All model definitions                         |
| `connections`  | `Record<string, IConnection>`              | No       | Named connections for multi-database setups   |
| `onQuery`      | `OnQueryCallback`                          | No       | Query observability callback                  |

All relationships are validated at startup. If a `belongsTo` or `hasMany` references a model not
included in `models`, `initialize()` throws immediately.

## getRepository()

Returns a typed read-write repository for a model.

```ts
const Product = bigal.getRepository(Product);
// Type: IRepository<InferSelect<typeof Product.schema>>
```

Throws if the model was not included in `models`.

## getReadonlyRepository()

Returns a typed read-only repository for a model.

```ts
const ViewRepo = bigal.getReadonlyRepository(StoreSummary);
// Type: IReadonlyRepository<InferSelect<typeof StoreSummary.schema>>
```

## table()

Creates a model with column metadata and inferred types. Exported as `defineTable` from the main
`'bigal'` package to avoid naming conflicts.

```ts
import { defineTable as table, serial, text } from 'bigal';

export const Product = table(
  'products',
  {
    id: serial().primaryKey(),
    name: text().notNull(),
  },
  {
    schema: 'public',
    readonly: false,
    hooks: {
      beforeCreate(v) {
        return v;
      },
    },
    filters: {
      active: { isActive: true },
    },
  },
);
```

**Parameters:**

| Parameter   | Type               | Description                         |
| ----------- | ------------------ | ----------------------------------- |
| `tableName` | `string`           | Database table or view name         |
| `schema`    | `SchemaDefinition` | Column and relationship definitions |
| `options`   | `TableOptions`     | Optional table-level configuration  |

**Returns:** `TableDefinition<TName, TSchema>` (frozen object)

### TableOptions

| Option       | Type                               | Description                                        |
| ------------ | ---------------------------------- | -------------------------------------------------- |
| `schema`     | `string`                           | PostgreSQL schema (default: `public`)              |
| `readonly`   | `boolean`                          | If `true`, returns read-only repository            |
| `connection` | `string`                           | Named connection key                               |
| `modelName`  | `string`                           | Override auto-derived model name                   |
| `hooks`      | `ModelHooks`                       | Lifecycle hooks                                    |
| `filters`    | `Record<string, FilterDefinition>` | Named filters auto-applied to find/findOne queries |

### TableDefinition

The returned object exposes:

| Property                | Type                               | Description                       |
| ----------------------- | ---------------------------------- | --------------------------------- |
| `tableName`             | `string`                           | Database table name               |
| `modelName`             | `string`                           | Auto-derived or overridden name   |
| `dbSchema`              | `string \| undefined`              | PostgreSQL schema                 |
| `isReadonly`            | `boolean`                          | Whether this is a read-only model |
| `connection`            | `string \| undefined`              | Named connection key              |
| `schema`                | `SchemaDefinition`                 | The column definitions            |
| `hooks`                 | `ModelHooks \| undefined`          | Lifecycle hooks                   |
| `filters`               | `Record<string, ...> \| undefined` | Global filters                    |
| `columns`               | `ColumnMetadata[]`                 | All column metadata               |
| `primaryKeyColumn`      | `ColumnMetadata`                   | Primary key column metadata       |
| `columnsByPropertyName` | `Record<string, ColumnMetadata>`   | Lookup by property name           |
| `columnsByColumnName`   | `Record<string, ColumnMetadata>`   | Lookup by database column name    |

## view()

Defines a read-only model backed by a PostgreSQL view. Equivalent to
`table(name, schema, { readonly: true, ...options })`.

```ts
import { view, serial, text, integer } from 'bigal';

export const ProductSummary = view('product_summaries', {
  id: serial().primaryKey(),
  name: text().notNull(),
  storeName: text().notNull(),
  categoryCount: integer().notNull(),
});
```

## Column builders

All column builders accept an optional `{ name: 'column_name' }` options object. When omitted, the
database column name is auto-derived from the property key using snakeCase conversion.

### Chain methods

| Method            | Description                              |
| ----------------- | ---------------------------------------- |
| `.notNull()`      | Removes `null` from the type             |
| `.default(value)` | Makes column optional on insert          |
| `.primaryKey()`   | Implies `.notNull()`, optional on insert |
| `.unique()`       | UNIQUE constraint (no type-level effect) |

### Builder functions

| Function                 | PostgreSQL type  | TypeScript type     |
| ------------------------ | ---------------- | ------------------- |
| `serial()`               | SERIAL           | `number`            |
| `bigserial()`            | BIGSERIAL        | `number`            |
| `text()`                 | TEXT             | `string \| null`    |
| `varchar(options?)`      | VARCHAR(n)       | `string \| null`    |
| `integer()`              | INTEGER          | `number \| null`    |
| `bigint()`               | BIGINT           | `number \| null`    |
| `smallint()`             | SMALLINT         | `number \| null`    |
| `float()` / `real()`     | REAL             | `number \| null`    |
| `double()`               | DOUBLE PRECISION | `number \| null`    |
| `boolean()`              | BOOLEAN          | `boolean \| null`   |
| `timestamp()`            | TIMESTAMP        | `Date \| null`      |
| `timestamptz()`          | TIMESTAMPTZ      | `Date \| null`      |
| `date()`                 | DATE             | `Date \| null`      |
| `json<T>()`              | JSON             | `T \| null`         |
| `jsonb<T>()`             | JSONB            | `T \| null`         |
| `uuid()`                 | UUID             | `string \| null`    |
| `bytea()`                | BYTEA            | `Buffer \| null`    |
| `textArray()`            | TEXT[]           | `string[] \| null`  |
| `integerArray()`         | INTEGER[]        | `number[] \| null`  |
| `booleanArray()`         | BOOLEAN[]        | `boolean[] \| null` |
| `vector({ dimensions })` | VECTOR(n)        | `number[] \| null`  |
| `createdAt()`            | TIMESTAMPTZ      | `Date`              |
| `updatedAt()`            | TIMESTAMPTZ      | `Date`              |

`serial()` and `bigserial()` imply `.notNull()` and `.default()`.

`createdAt()` defaults to column name `created_at`. `updatedAt()` defaults to `updated_at`.

`vector()` requires the `dimensions` option. Requires the pgvector PostgreSQL extension.

### VarcharOptions

```ts
interface VarcharOptions {
  name?: string;
  length?: number;
}
```

### VectorOptions

```ts
interface VectorOptions {
  name?: string;
  dimensions: number;
}
```

## Relationship builders

### belongsTo()

Defines a many-to-one relationship where this table holds the foreign key.

```ts
import { belongsTo } from 'bigal';

store: belongsTo('Store'),
store: belongsTo('Store', { name: 'shop_id' }),
```

**Parameters:**

| Parameter  | Type                           | Description                                             |
| ---------- | ------------------------------ | ------------------------------------------------------- |
| `modelRef` | `string` or `() => TableDef`   | Model name string or arrow function returning table def |
| `options`  | `string` or `{ name: string }` | FK column name (auto-derived as `snakeCase(key)_id`)    |

**Select type:** the FK type (typically `number`).

**Insert type:** the FK type (required by default).

### hasMany()

Defines a one-to-many or many-to-many relationship.

```ts
import { hasMany } from 'bigal';

// One-to-many
products: hasMany('Product').via('store'),

// Many-to-many
categories: hasMany('Category')
  .through('ProductCategory')
  .via('product'),
```

**Chain methods:**

| Method               | Description                               |
| -------------------- | ----------------------------------------- |
| `.via(propertyName)` | Property on the related table with the FK |
| `.through(modelRef)` | Junction table for many-to-many           |

`hasMany` columns are excluded from both the select and insert types.

## Repository

Full CRUD repository returned by `getRepository()` or object-style destructuring.

### find()

```ts
repository.find(options?): FindQuery<T>
```

Returns a query builder for multiple records. Options: `{ select?, pool? }`.

### findOne()

```ts
repository.findOne(options?): FindOneQuery<T>
```

Returns a query builder for a single record or `null`. Options: `{ select?, pool? }`.

### count()

```ts
repository.count(options?): CountQuery<T>
```

Returns a query builder that resolves to a number. Options: `{ pool? }`.

### create()

```ts
repository.create(values, options?): Promise<QueryResult<T>>
repository.create(values[], options?): Promise<QueryResult<T>[]>
```

Insert one or multiple records. Options: `{ returnRecords?, returnSelect?, onConflict? }`.

### update()

```ts
repository.update(where, values, options?): Promise<QueryResult<T>[]>
```

Update matching records. Options: `{ returnRecords?, returnSelect? }`.

### destroy()

```ts
repository.destroy(where, options?): Promise<QueryResult<T>[]>
```

Delete matching records. Options: `{ returnRecords?, returnSelect? }`.

## ReadonlyRepository

Read-only repository returned by `getReadonlyRepository()` or for models with `readonly: true`.
Exposes `find()`, `findOne()`, and `count()` only.

## Query builder methods

All query types support fluent chaining. Each method returns a new immutable instance.

| Method                             | Available on         | Description                       |
| ---------------------------------- | -------------------- | --------------------------------- |
| `.where(query)`                    | find, findOne, count | Filter records                    |
| `.sort(value)`                     | find, findOne        | Order results                     |
| `.limit(n)`                        | find                 | Limit rows returned               |
| `.skip(n)`                         | find                 | Skip rows                         |
| `.paginate(page, pageSize)`        | find                 | Shorthand for skip + limit        |
| `.withCount()`                     | find                 | Return `{ results, totalCount }`  |
| `.populate(relation, options?)`    | find, findOne        | Load related entities             |
| `.join(relation, alias?, on?)`     | find, findOne        | INNER JOIN                        |
| `.leftJoin(relation, alias?, on?)` | find, findOne        | LEFT JOIN                         |
| `.distinctOn(columns)`             | find                 | PostgreSQL DISTINCT ON            |
| `.filters(value)`                  | find, findOne        | Override global filters           |
| `.toSQL()`                         | all operations       | Get generated SQL without running |

### toSQL()

Returns the generated SQL and parameters without executing the query. Available on `find`, `findOne`,
`create`, `update`, and `destroy`:

```ts
const { sql, params } = Product.find().where({ name: 'Widget' }).toSQL();
```

### filters()

Override global filters defined on the table:

```ts
// Disable all filters
Product.find().where({}).filters(false);

// Disable a specific filter
Product.find().where({}).filters({ active: false });
```

## subquery()

```ts
import { subquery } from 'bigal';

const sub = subquery(repository);
```

Returns a `SubqueryBuilder` with methods: `select()`, `where()`, `sort()`, `limit()`, `groupBy()`,
`having()`, `distinctOn()`.

Scalar aggregate shortcuts: `sub.count()`, `sub.sum(col)`, `sub.avg(col)`, `sub.max(col)`,
`sub.min(col)`.

## Types

### Repository\<T\>

Type alias for a typed read-write repository. Accepts `typeof YourTableDef`:

```ts
import type { Repository } from 'bigal';

function process(repo: Repository<typeof Product>) {
  /* ... */
}
```

### ReadonlyRepository\<T\>

Type alias for a typed read-only repository:

```ts
import type { ReadonlyRepository } from 'bigal';

function read(repo: ReadonlyRepository<typeof ProductSummary>) {
  /* ... */
}
```

### InferSelect\<TSchema\>

Mapped type that extracts the row type from a schema definition:

```ts
type ProductRow = InferSelect<(typeof Product)['schema']>;
```

### InferInsert\<TSchema\>

Mapped type that extracts the insert parameter type from a schema definition:

```ts
type ProductInsert = InferInsert<(typeof Product)['schema']>;
```

### ModelHooks\<TInsert, TSelect\>

```ts
interface ModelHooks<TInsert, TSelect = TInsert> {
  beforeCreate?: (values: TInsert) => Promise<TInsert> | TInsert;
  afterCreate?: (result: TSelect) => Promise<void> | void;
  beforeUpdate?: (values: Partial<TInsert>) => Partial<TInsert> | Promise<Partial<TInsert>>;
  afterUpdate?: (result: TSelect) => Promise<void> | void;
  beforeDestroy?: (where: Record<string, unknown>) => Promise<Record<string, unknown>> | Record<string, unknown>;
  afterDestroy?: (result: { rowCount: number }) => Promise<void> | void;
  afterFind?: (results: TSelect[]) => Promise<TSelect[]> | TSelect[];
}
```

### FilterDefinition

```ts
type FilterDefinition = (() => Record<string, unknown>) | Record<string, unknown>;
```

A static where clause object or a function that returns one dynamically.

### OnQueryCallback

```ts
type OnQueryCallback = (event: OnQueryEvent) => void;
```

### OnQueryEvent

```ts
interface OnQueryEvent {
  sql: string;
  params: readonly unknown[];
  duration: number;
  error?: Error;
  model: string;
  operation: 'count' | 'create' | 'destroy' | 'find' | 'findOne' | 'update';
}
```

### VectorDistanceSort

```ts
interface VectorDistanceSort {
  nearestTo: number[];
  metric?: 'cosine' | 'innerProduct' | 'l1' | 'l2';
}
```

Used in `.sort()` for nearest-neighbor queries on vector columns.

### VectorDistanceMetric

```ts
type VectorDistanceMetric = 'cosine' | 'innerProduct' | 'l1' | 'l2';
```

### QueryResult\<T\>

Narrows relationship fields from union types to foreign key types. See
[Relationships > QueryResult](/guide/relationships#queryresult-type-narrowing).

### TypedAggregateExpression\<Alias\>

Return type annotation for aggregate callbacks that enables type-safe sorting on subquery join columns.

### PoolLike

Interface for compatible connection pools. Supported: `postgres-pool`, `pg`,
`@neondatabase/serverless`.

### IConnection

```ts
interface IConnection {
  pool: PoolLike;
  readonlyPool?: PoolLike;
}
```

### IRepository\<T\>

Interface for full CRUD repositories.

### IReadonlyRepository\<T\>

Interface for read-only repositories.
