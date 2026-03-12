---
description: Complete API reference for BigAl — initialize(), Repository, ReadonlyRepository, query builder methods, subquery(), decorators, and types.
---

# API Reference

All public exports from `bigal`.

## initialize()

Creates repositories for all provided models.

```ts
import { initialize } from 'bigal';

const repos = initialize({
  models: [Product, Store],
  pool,
  readonlyPool,
  connections,
  expose,
});
```

**Parameters:** `InitializeOptions`

| Option         | Type                          | Required | Description                                   |
| -------------- | ----------------------------- | -------- | --------------------------------------------- |
| `models`       | `EntityStatic<Entity>[]`      | Yes      | Model classes decorated with `@table()`       |
| `pool`         | `PoolLike`                    | Yes      | Primary connection pool                       |
| `readonlyPool` | `PoolLike`                    | No       | Pool for read operations (defaults to `pool`) |
| `connections`  | `Record<string, IConnection>` | No       | Named connections for multi-database setups   |
| `expose`       | `(repo, metadata) => void`    | No       | Callback invoked for each created repository  |

**Returns:** `Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>`

## Repository

Full CRUD repository returned by `initialize()` for non-readonly models.

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

Read-only repository returned for models with `readonly: true`. Exposes `find()`, `findOne()`, and `count()` only.

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
| `.toJSON()`                        | find, findOne        | Return plain objects             |

## subquery()

```ts
import { subquery } from 'bigal';

const sub = subquery(repository);
```

Returns a `SubqueryBuilder` with methods: `select()`, `where()`, `sort()`, `limit()`, `groupBy()`, `having()`, `distinctOn()`.

Scalar aggregate shortcuts: `sub.count()`, `sub.sum(col)`, `sub.avg(col)`, `sub.max(col)`, `sub.min(col)`.

## Decorators

### @table(options)

Binds a class to a database table or view.

| Option       | Type      | Description                            |
| ------------ | --------- | -------------------------------------- |
| `name`       | `string`  | Table or view name                     |
| `schema`     | `string`  | PostgreSQL schema (default: `public`)  |
| `readonly`   | `boolean` | Returns `ReadonlyRepository` if `true` |
| `connection` | `string`  | Named connection key                   |

### @primaryColumn(options)

Marks the primary key. Options: `{ type }`.

### @column(options)

Defines a column. See [Models > Column options](/guide/models#column-options) for all options.

### @createDateColumn()

Auto-set on insert.

### @updateDateColumn()

Auto-set on update.

### @versionColumn()

Auto-incrementing version for optimistic locking.

## Types

### Entity

Base class for all models.

### NotEntity\<T\>

Wrapper type for JSON column objects that have an `id` field. Prevents BigAl's type system from treating them as entities.

### QueryResult\<T\>

Narrows relationship fields from union types to foreign key types. See [Relationships > QueryResult](/guide/relationships#queryresult-type-narrowing).

### QueryResultPopulated\<T, K\>

Type for entities with specific relationships populated.

### TypedAggregateExpression\<Alias\>

Return type annotation for aggregate callbacks that enables type-safe sorting on subquery join columns.

### PoolLike

Interface for compatible connection pools. Supported: `postgres-pool`, `pg`, `@neondatabase/serverless`.

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
