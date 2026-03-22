---
description: Complete API reference for BigAl -- createBigAl(), table(), column builders, relationships, repository methods, query builder, and types.
---

# API Reference

All public exports from `bigal`.

## createBigAl()

Creates a BigAl instance with typed repositories for all provided table definitions.

```ts
import { createBigAl } from 'bigal';

const bigal = createBigAl({
  pool,
  readonlyPool,
  models: [Product, Store, Category, ProductCategory],
  connections: {
    audit: { pool: auditPool },
  },
  onQuery({ sql, params, duration, error, model, operation }) {
    logger.debug({ sql, params, duration, model, operation });
  },
});
```

**Parameters:** `BigAlOptions`

| Option         | Type                          | Required | Description                                   |
| -------------- | ----------------------------- | -------- | --------------------------------------------- |
| `pool`         | `PoolLike`                    | Yes      | Primary connection pool                       |
| `readonlyPool` | `PoolLike`                    | No       | Pool for read operations (defaults to `pool`) |
| `models`       | `TableDefinition[]`           | Yes      | All table definitions                         |
| `connections`  | `Record<string, IConnection>` | No       | Named connections for multi-database setups   |
| `onQuery`      | `OnQueryCallback`             | No       | Query observability callback                  |

**Returns:** `BigAlInstance`

All relationships are validated eagerly at construction time. If a `belongsTo` or `hasMany` references
a table not included in `models`, `createBigAl()` throws immediately.

## getRepository()

Returns a typed read-write repository for a table definition.

```ts
const ProductRepo = bigal.getRepository(Product);
// Type: IRepository<typeof Product.$inferSelect>
```

Throws if the table was not included in the `models` array.

## getReadonlyRepository()

Returns a typed read-only repository for a table definition.

```ts
const ViewRepo = bigal.getReadonlyRepository(StoreSummary);
// Type: IReadonlyRepository<typeof StoreSummary.$inferSelect>
```

## table()

Creates a table definition with column metadata and inferred types. Exported as `defineTable` from the
main `'bigal'` package to avoid naming conflicts.

```ts
import { defineTable as table, serial, text } from 'bigal';

export const Product = table(
  'products',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
  },
  {
    schema: 'public',
    readonly: false,
    connection: undefined,
    hooks: {
      beforeCreate(v) {
        return v;
      },
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

| Option       | Type         | Description                             |
| ------------ | ------------ | --------------------------------------- |
| `schema`     | `string`     | PostgreSQL schema (default: `public`)   |
| `readonly`   | `boolean`    | If `true`, returns read-only repository |
| `connection` | `string`     | Named connection key                    |
| `hooks`      | `ModelHooks` | Lifecycle hooks                         |

### TableDefinition

The returned object exposes:

| Property                | Type                             | Description                       |
| ----------------------- | -------------------------------- | --------------------------------- |
| `tableName`             | `string`                         | Database table name               |
| `dbSchema`              | `string \| undefined`            | PostgreSQL schema                 |
| `isReadonly`            | `boolean`                        | Whether this is a read-only model |
| `connection`            | `string \| undefined`            | Named connection key              |
| `schema`                | `SchemaDefinition`               | The column definitions            |
| `hooks`                 | `ModelHooks \| undefined`        | Lifecycle hooks                   |
| `columns`               | `ColumnMetadata[]`               | All column metadata               |
| `primaryKeyColumn`      | `ColumnMetadata`                 | Primary key column metadata       |
| `columnsByPropertyName` | `Record<string, ColumnMetadata>` | Lookup by property name           |
| `columnsByColumnName`   | `Record<string, ColumnMetadata>` | Lookup by database column name    |
| `$inferSelect`          | Phantom type                     | Row type for queries              |
| `$inferInsert`          | Phantom type                     | Insert parameter type             |

## Column builders

All column builders accept a database column name and return a `ColumnBuilder` with chain methods.

### Chain methods

| Method            | Description                              |
| ----------------- | ---------------------------------------- |
| `.notNull()`      | Removes `null` from the type             |
| `.default(value)` | Makes column optional on insert          |
| `.primaryKey()`   | Implies `.notNull()`, optional on insert |
| `.unique()`       | UNIQUE constraint (no type-level effect) |

### Builder functions

| Function                  | PostgreSQL type  | TypeScript type     |
| ------------------------- | ---------------- | ------------------- |
| `serial(name)`            | SERIAL           | `number`            |
| `bigserial(name)`         | BIGSERIAL        | `number`            |
| `text(name)`              | TEXT             | `string \| null`    |
| `varchar(name, options?)` | VARCHAR(n)       | `string \| null`    |
| `integer(name)`           | INTEGER          | `number \| null`    |
| `bigint(name)`            | BIGINT           | `number \| null`    |
| `smallint(name)`          | SMALLINT         | `number \| null`    |
| `real(name)`              | REAL             | `number \| null`    |
| `doublePrecision(name)`   | DOUBLE PRECISION | `number \| null`    |
| `boolean(name)`           | BOOLEAN          | `boolean \| null`   |
| `timestamp(name)`         | TIMESTAMP        | `Date \| null`      |
| `timestamptz(name)`       | TIMESTAMPTZ      | `Date \| null`      |
| `date(name)`              | DATE             | `Date \| null`      |
| `json<T>(name)`           | JSON             | `T \| null`         |
| `jsonb<T>(name)`          | JSONB            | `T \| null`         |
| `uuid(name)`              | UUID             | `string \| null`    |
| `bytea(name)`             | BYTEA            | `Buffer \| null`    |
| `textArray(name)`         | TEXT[]           | `string[] \| null`  |
| `integerArray(name)`      | INTEGER[]        | `number[] \| null`  |
| `booleanArray(name)`      | BOOLEAN[]        | `boolean[] \| null` |
| `createdAt(name?)`        | TIMESTAMPTZ      | `Date`              |
| `updatedAt(name?)`        | TIMESTAMPTZ      | `Date`              |

`serial()` and `bigserial()` imply `.notNull()` and `.default()`.

`createdAt()` defaults to column name `created_at`. `updatedAt()` defaults to `updated_at`.

### VarcharOptions

```ts
interface VarcharOptions {
  length?: number;
}
```

## Relationship builders

### belongsTo()

Defines a many-to-one relationship where this table holds the foreign key.

```ts
import { belongsTo } from 'bigal';

store: belongsTo(() => Store, 'store_id'),
```

**Parameters:**

| Parameter      | Type                    | Description                                |
| -------------- | ----------------------- | ------------------------------------------ |
| `modelFn`      | `() => TableDefinition` | Arrow function returning the related table |
| `fkColumnName` | `string`                | Database column name for the FK            |

**Select type:** the FK type (typically `number`).

**Insert type:** the FK type (required by default).

### hasMany()

Defines a one-to-many or many-to-many relationship.

```ts
import { hasMany } from 'bigal';

// One-to-many
products: hasMany(() => Product).via('store'),

// Many-to-many
categories: hasMany(() => Category)
  .through(() => ProductCategory)
  .via('product'),
```

**Chain methods:**

| Method               | Description                               |
| -------------------- | ----------------------------------------- |
| `.via(propertyName)` | Property on the related table with the FK |
| `.through(modelFn)`  | Junction table for many-to-many           |

`hasMany` columns are excluded from both `$inferSelect` and `$inferInsert`.

## Repository

Full CRUD repository returned by `getRepository()`.

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

| Method                             | Available on         | Description                      |
| ---------------------------------- | -------------------- | -------------------------------- |
| `.where(query)`                    | find, findOne, count | Filter records                   |
| `.sort(value)`                     | find, findOne        | Order results                    |
| `.limit(n)`                        | find                 | Limit rows returned              |
| `.skip(n)`                         | find                 | Skip rows                        |
| `.paginate(page, pageSize)`        | find                 | Shorthand for skip + limit       |
| `.withCount()`                     | find                 | Return `{ results, totalCount }` |
| `.populate(relation, options?)`    | find, findOne        | Load related entities            |
| `.join(relation, alias?, on?)`     | find, findOne        | INNER JOIN                       |
| `.leftJoin(relation, alias?, on?)` | find, findOne        | LEFT JOIN                        |
| `.distinctOn(columns)`             | find                 | PostgreSQL DISTINCT ON           |

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

### InferSelect\<TSchema\>

Mapped type that extracts the row type from a schema definition. Equivalent to
`typeof tableDef.$inferSelect`.

### InferInsert\<TSchema\>

Mapped type that extracts the insert parameter type from a schema definition. Equivalent to
`typeof tableDef.$inferInsert`.

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

### ModelHooks\<TInsert\>

```ts
interface ModelHooks<TInsert> {
  beforeCreate?: (values: TInsert) => Promise<TInsert> | TInsert;
  beforeUpdate?: (values: Partial<TInsert>) => Partial<TInsert> | Promise<Partial<TInsert>>;
}
```
