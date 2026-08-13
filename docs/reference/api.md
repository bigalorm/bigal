---
description: Complete API reference for BigAl - initialize(), Repository, ReadonlyRepository, query builder methods, subquery(), decorators, and types.
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

Returns a query builder that resolves to a number. Options: `{ pool? }`. Prefer this over `findOne()` for existence checks - it performs better since it doesn't select or hydrate a row.

### create()

```ts
repository.create(values, options?): Promise<QueryResult<T>>
repository.create(values[], options?): Promise<QueryResult<T>[]>
```

Insert one or multiple records. Options: `{ returnRecords?, returnSelect?, onConflict? }`.

An array inserts in a single statement. Prefer this over calling `create()` in a loop, which costs one round trip per record.

`returnSelect` narrows the returned columns and `returnRecords: false` skips them entirely, cutting transfer and hydration cost.

### update()

```ts
repository.update(where, values, options?): Promise<QueryResult<T>[]>
```

Update matching records. Options: `{ returnRecords?, returnSelect? }`. As with `create()`, use `returnSelect` to return only the columns you need or `returnRecords: false` to skip the returned rows.

### destroy()

```ts
repository.destroy(where, options?): Promise<void>
repository.destroy(where, { returnRecords: true }): Promise<QueryResult<T>[]>
```

Delete matching records. Options: `{ returnRecords?, returnSelect? }`.
Unlike `create()`/`update()`, `destroy()` does not return records by default (plain `DELETE`, no `RETURNING`); pass `returnRecords: true` or `returnSelect` to get the deleted rows back.

## ReadonlyRepository

Read-only repository returned for models with `readonly: true`. Exposes `find()`, `findOne()`, and `count()` only.

## Query builder methods

All query types support fluent chaining. Chained methods build up a single query object, which executes when
awaited. Each call to `find()`, `findOne()`, or `count()` starts a fresh query.

| Method                                 | Available on         | Description                      |
| -------------------------------------- | -------------------- | -------------------------------- |
| `.where(query)`                        | find, findOne, count | Filter records                   |
| `.select(columns)`                     | find, findOne        | Narrow returned columns          |
| `.sort(value)`                         | find, findOne        | Order results                    |
| `.limit(n)`                            | find                 | Limit rows returned              |
| `.skip(n)`                             | find                 | Skip rows                        |
| `.paginate({ page, limit })`           | find                 | Shorthand for skip + limit       |
| `.withCount()`                         | find                 | Return `{ results, totalCount }` |
| `.populate(propertyName, options?)`    | find, findOne        | Load related entities            |
| `.join(propertyName, alias?)`          | find, findOne        | INNER JOIN                       |
| `.leftJoin(propertyName, alias?, on?)` | find, findOne        | LEFT JOIN                        |
| `.distinctOn(columns)`                 | find                 | PostgreSQL DISTINCT ON           |
| `.toJSON()`                            | find, findOne        | Return plain objects             |
| `.UNSAFE_withOriginalFieldType(name)`  | find, findOne        | Type-level escape hatch          |
| `.UNSAFE_withFieldValue(name, value)`  | findOne              | Set a field after the query      |

### where()

```ts
query.where(whereQuery);
```

Filter records. Calling `.where()` again replaces the previous filter, so combine conditions in one object.
See [Querying > Where operators](/guide/querying#where-operators) for the operator syntax.

```ts
await productRepository.find().where({ price: { '>=': 100 }, store: storeId });
```

### select()

```ts
query.select(columns);
```

Narrow the returned columns; the result type narrows to the picked keys. Equivalent to the `select` option on
`find()`/`findOne()`. The primary key column is always included in the generated SQL.

```ts
const products = await productRepository.find().select(['name', 'sku']);
// products: Pick<QueryResult<Product>, 'name' | 'sku'>[]
```

### sort()

```ts
query.sort(value);
```

Order results. Accepts a string (`'name'`, `'name asc'`, `'name asc, createdAt desc'`) or an object
(`{ name: 1, createdAt: -1 }`, with `1`/`'asc'` and `-1`/`'desc'`). Direction defaults to ascending.
Repeated `.sort()` calls append sort columns. Vector columns accept `{ nearestTo, metric }` - see
[Querying > Vector distance queries](/guide/querying#vector-distance-queries).

```ts
await productRepository.find().sort('store').sort('createdAt desc');
// Same as .sort('store, createdAt desc')
```

### limit() / skip()

```ts
query.limit(count);
query.skip(count);
```

`LIMIT` and `OFFSET` for the query.

### paginate()

```ts
query.paginate({ page, limit });
```

Shorthand for `.skip((page - 1) * limit).limit(limit)`. `page` starts at 1; values below 1 are treated as
page 1.

```ts
await productRepository.find().where({ store: storeId }).paginate({ page: 2, limit: 25 });
// SQL: ... LIMIT 25 OFFSET 25
```

### withCount()

```ts
query.withCount();
```

Resolves to `{ results, totalCount }` in a single query using `COUNT(*) OVER()`. `totalCount` is the number
of rows matching the where clause, ignoring `limit`/`skip`. Throws when combined with `.distinctOn()`.

```ts
const { results, totalCount } = await productRepository.find().where({ store: storeId }).paginate({ page: 1, limit: 10 }).withCount();
```

### populate()

```ts
query.populate(propertyName, options?)
```

Load related entities. Runs a separate query per relation after the main query resolves (batched by id - no
SQL `JOIN`) and changes the property's result type from foreign key to populated entity. Chain once per
relation; the populate queries run in parallel.

**Options:** `PopulateArgs`

| Option    | Type                | Description                                                                    |
| --------- | ------------------- | ------------------------------------------------------------------------------ |
| `select`  | `string[]`          | Columns to return on the related entities. The primary key is always included. |
| `where`   | `WhereQuery`        | Filter related rows.                                                           |
| `sort`    | `string \| object`  | Order related rows. Same syntax as `.sort()`.                                  |
| `skip`    | `number`            | Skip related rows. Collections only.                                           |
| `limit`   | `number`            | Maximum related rows to return. Collections only.                              |
| `pool`    | `PoolLike`          | Connection pool for the populate query. Defaults to the main query's pool.     |
| `through` | `{ where?, sort? }` | Filter and order by junction table columns. Many-to-many relations only.       |

Options apply to the related rows only, never to the primary results. See
[Querying > Populate](/guide/querying#populate) for per-relation behavior and caveats.

```ts
const product = await productRepository
  .findOne()
  .where({ id: 42 })
  .populate('store', { select: ['name'] })
  .populate('categories', { where: { isActive: true }, through: { sort: 'ordering asc' } });
```

### join() / leftJoin()

```ts
query.join(propertyName, alias?)
query.leftJoin(propertyName, alias?, on?)
query.join(subquery, alias, { on })       // find only
query.leftJoin(subquery, alias, { on })   // find only
```

Add an `INNER JOIN` or `LEFT JOIN` to the main query so `.where()` and `.sort()` can reference joined
columns (`.where({ alias: { column: value } })`, `.sort('alias.column desc')`). Joins do not hydrate related
entities - use `.populate()` for that. Subquery joins are available on `find()` only. See
[Subqueries and Joins](/guide/subqueries-and-joins#model-joins).

```ts
const products = await productRepository
  .find()
  .join('store')
  .where({ store: { name: 'Acme' } });
```

### distinctOn()

```ts
query.distinctOn(columns);
```

PostgreSQL `DISTINCT ON` - one row per unique combination of the given columns. The `ORDER BY` must start
with the same columns in the same order, and `.distinctOn()` cannot be combined with `.withCount()`. See
[Querying > DISTINCT ON](/guide/querying#distinct-on).

```ts
const latestPerStore = await productRepository.find().distinctOn(['store']).sort('store').sort('createdAt desc');
```

### toJSON()

```ts
query.toJSON();
```

Return plain objects instead of entity class instances, including populated relations. Useful when results
must be serializable.

```ts
const product = await productRepository.findOne().where({ id: 42 }).populate('store').toJSON();
```

### UNSAFE_withOriginalFieldType()

```ts
query.UNSAFE_withOriginalFieldType(propertyName);
```

Type-level escape hatch with no runtime effect: restores a relation property's original entity type (for
example `number | Store` instead of the narrowed `number`). Prefer `.populate()` or
`QueryResultPopulated<T, K>` when possible.

### UNSAFE_withFieldValue()

```ts
findOneQuery.UNSAFE_withFieldValue(propertyName, value);
```

`findOne()` only. Sets the property to the given value after the query resolves and types the result
accordingly. The value is applied in memory - nothing is written to the database.

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
Vector columns are declared with `{ type: 'vector', dimensions: n }` (`dimensions` is informational -
BigAl does not issue DDL).

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

### VectorDistanceMetric

```ts
type VectorDistanceMetric = 'cosine' | 'innerProduct' | 'l1' | 'l2';
```

### VectorDistanceSort

```ts
interface VectorDistanceSort {
  nearestTo: number[];
  metric?: VectorDistanceMetric;
}
```

Used in `.sort()` for nearest-neighbor queries on vector columns. See
[Querying > Vector distance queries](/guide/querying#vector-distance-queries).

### VectorDistanceConstraint

```ts
interface VectorDistanceConstraint {
  nearestTo: number[];
  metric?: VectorDistanceMetric;
  distance: Partial<Record<'<' | '<=' | '>' | '>=', number>>;
}
```

Used in where clauses to filter vector columns by distance threshold. At least one `distance` bound is
required (pgvector distance operators return a number, so a bare distance expression is not a valid
where clause); multiple bounds are combined with `AND`. To order by distance without filtering, use
`sort()` with `nearestTo` instead.

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
