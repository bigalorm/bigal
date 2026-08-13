---
description: Fluent query builder for find, findOne, and count with WHERE operators, JSONB querying, pagination, sorting, DISTINCT ON, and populate.
---

# Querying

BigAl provides `findOne()`, `find()`, and `count()` methods on repositories. Queries use a fluent builder pattern -
chained methods build up one query object, and queries are `PromiseLike` so you can `await` the chain directly.
Each call to `find()`, `findOne()`, or `count()` starts a fresh query. See the
[API reference](/reference/api#query-builder-methods) for the full list of chainable methods.

## findOne

Returns a single record or `null`:

```ts
const product = await productRepository.findOne().where({ id: 42 });
```

### Query projection

Pass `select` to return only the columns you need instead of every column (the default).
This shrinks the SELECT list, reduces bytes transferred, and lowers hydration cost.
It is a large win for wide rows, big JSON blobs, or vector/embedding columns you do not need on a given path.
`find()` and `populate()` accept the same option.

```ts
const product = await productRepository
  .findOne({
    select: ['name', 'sku'],
  })
  .where({ id: 42 });

// find() takes the same option
const products = await productRepository.find({ select: ['name', 'sku'] }).where({ store: storeId });
```

`.select()` is also available as a chained method and narrows the result type to the picked columns:

```ts
const products = await productRepository.find().select(['name', 'sku']).where({ store: storeId });
// products: Pick<QueryResult<Product>, 'name' | 'sku'>[]
```

The primary key column is always included in the generated SQL, even when it is not in the `select` list.

### Pool override

Use an explicit connection pool:

```ts
const product = await productRepository
  .findOne({
    pool: poolOverride,
  })
  .where({ id: 42 });
```

## find

Returns an array of records:

```ts
const products = await productRepository.find().where({ store: storeId });
```

## count

Returns the number of matching records:

```ts
const count = await productRepository.count().where({
  name: { like: 'Widget%' },
});
```

If you only need to know whether a match exists, use `count()` instead of `findOne()` - it performs better since it doesn't select or hydrate a row:

```ts
const exists = (await productRepository.count().where({ sku: 'ABC123' })) > 0;
```

## Where operators

Calling `.where()` more than once replaces the previous filter - combine conditions in a single object
instead. (`.sort()` is the opposite: repeated calls [append](#multiple-sort-calls).)

### String matching

All string operators use case-insensitive matching (`ILIKE`) and accept arrays for OR conditions.

| Operator     | Description       | SQL Pattern |
| ------------ | ----------------- | ----------- |
| `like`       | Raw ILIKE pattern | As provided |
| `contains`   | Substring match   | `%value%`   |
| `startsWith` | Prefix match      | `value%`    |
| `endsWith`   | Suffix match      | `%value`    |

```ts
await productRepository.find().where({ name: { contains: 'widget' } });
// SQL: WHERE name ILIKE '%widget%'

await productRepository.find().where({ name: { startsWith: 'Pro' } });
// SQL: WHERE name ILIKE 'Pro%'
```

### Comparison operators

| Operator | Description           |
| -------- | --------------------- |
| `<`      | Less than             |
| `<=`     | Less than or equal    |
| `>`      | Greater than          |
| `>=`     | Greater than or equal |

```ts
await productRepository.find().where({ price: { '>=': 100 } });

// Multiple operators on same field (AND)
await productRepository.find().where({
  createdAt: { '>=': startDate, '<': endDate },
});
```

### Array values (IN)

```ts
await personRepository.find().where({ age: [22, 23, 24] });
// SQL: WHERE age IN ($1, $2, $3)
```

### Negation (`!`)

```ts
await productRepository.find().where({ status: { '!': 'discontinued' } });
// SQL: WHERE status <> $1

await productRepository.find().where({ status: { '!': ['a', 'b'] } });
// SQL: WHERE status NOT IN ($1, $2)

await productRepository.find().where({ deletedAt: { '!': null } });
// SQL: WHERE deleted_at IS NOT NULL
```

### OR conditions

```ts
await personRepository.find().where({
  or: [{ firstName: 'Walter' }, { lastName: 'White' }],
});
// SQL: WHERE (first_name = $1) OR (last_name = $2)
```

### AND with nested OR

```ts
await personRepository.find().where({
  and: [{ or: [{ firstName: 'Walter' }, { lastName: 'White' }] }, { or: [{ firstName: 'Jesse' }, { lastName: 'Pinkman' }] }],
});
```

## JSONB querying

BigAl supports querying properties within JSON/JSONB columns using PostgreSQL's `->>` operator.

### Property equality

```ts
await repo.find().where({ bar: { theme: 'dark' } });
// SQL: WHERE "bar"->>'theme'=$1
```

### Comparisons on JSON properties

Numeric and boolean values are automatically cast:

```ts
await repo.find().where({ bar: { retryCount: { '>=': 3 } } });
// SQL: WHERE ("bar"->>'retryCount')::numeric>=$1

await repo.find().where({ bar: { active: true } });
// SQL: WHERE ("bar"->>'active')::boolean=$1
```

### Nested paths

Intermediate segments use `->`, final segment uses `->>`:

```ts
await repo.find().where({ bar: { failure: { stage: 'transcription' } } });
// SQL: WHERE "bar"->'failure'->>'stage'=$1

await repo.find().where({ bar: { a: { b: { c: 'value' } } } });
// SQL: WHERE "bar"->'a'->'b'->>'c'=$1
```

### Null checks

Check if a JSONB property is null or not null:

```ts
await repo.find().where({ bar: { theme: null } });
// SQL: WHERE "bar"->>'theme' IS NULL

await repo.find().where({ bar: { theme: { '!': null } } });
// SQL: WHERE "bar"->>'theme' IS NOT NULL
```

Note that `IS NULL` on a JSONB property is true both when the key is missing from the object and when it is
explicitly set to `null`. This matches PostgreSQL's behavior - the `->>` operator returns `NULL` in both cases.

Properties set to `undefined` in a where clause are silently ignored (standard JavaScript - `undefined` values are
dropped by `Object.entries`). To query for missing or null properties, always use `null` explicitly.

### JSONB containment

Combine `contains` with property access:

```ts
await repo.find().where({
  bar: { contains: { type: 'recovery' }, retryCount: { '<': 3 } },
});
// SQL: WHERE "bar"@>$1::jsonb AND ("bar"->>'retryCount')::numeric<$2
```

## Sorting

### String syntax

Direction is `asc` or `desc` (case-insensitive) and defaults to ascending when omitted:

```ts
await productRepository.find().where({}).sort('name'); // ASC
await productRepository.find().where({}).sort('name asc');
await productRepository.find().where({}).sort('name asc, createdAt desc');
```

### Object syntax

Values can be `1`/`-1` or `'asc'`/`'desc'`:

```ts
await productRepository.find().where({}).sort({ name: 1 }); // ASC
await productRepository.find().where({}).sort({ name: 1, createdAt: -1 }); // ASC, DESC
await productRepository.find().where({}).sort({ name: 'asc', createdAt: 'desc' }); // Same as above
```

### Multiple sort calls

Repeated `.sort()` calls append sort columns instead of replacing them - these are equivalent:

```ts
await productRepository.find().sort('store').sort('createdAt desc');
await productRepository.find().sort('store, createdAt desc');
```

## Vector distance queries

BigAl supports nearest-neighbor queries on columns declared with `@column({ type: 'vector', dimensions: n })`,
backed by the [pgvector](https://github.com/pgvector/pgvector) extension. Four distance metrics are
available: `cosine`, `l2`, `l1`, and `innerProduct`. The `l1` metric requires pgvector >= 0.7.0.

| Metric         | PostgreSQL operator | Description               |
| -------------- | ------------------- | ------------------------- |
| `cosine`       | `<=>`               | Cosine distance (default) |
| `l2`           | `<->`               | Euclidean distance        |
| `l1`           | `<+>`               | Manhattan distance        |
| `innerProduct` | `<#>`               | Negative inner product    |

### Sorting by distance

Use the `nearestTo` sort to order results by vector similarity:

```ts
const similar = await documentRepository
  .find()
  .where({ title: { contains: 'biology' } })
  .sort({ embedding: { nearestTo: queryVector, metric: 'cosine' } })
  .limit(10);
// SQL: ... WHERE "title" ILIKE $1 ORDER BY "embedding" <=> $2 LIMIT 10
```

The `metric` option defaults to `'cosine'` if omitted. An unknown metric throws a `QueryError`.

### Filtering by distance

Combine `nearestTo` in the where clause with a distance threshold:

```ts
const nearby = await documentRepository
  .find()
  .where({
    embedding: {
      nearestTo: queryVector,
      metric: 'cosine',
      distance: { '<': 0.5 },
    },
  })
  .sort({ embedding: { nearestTo: queryVector, metric: 'cosine' } })
  .limit(10);
// SQL: ... WHERE "embedding" <=> $1 < $2 ORDER BY "embedding" <=> $3 LIMIT 10
```

At least one `distance` bound is required in where clauses; multiple bounds are combined with `AND`
(for example `distance: { '>': 0.1, '<': 0.5 }` finds a distance band). Vectors must be non-empty
arrays of finite numbers.

### Equality and writes

Vector values round-trip as `number[]`. Where clauses compare whole vectors, and create/update
serialize the array to pgvector's text format:

```ts
await documentRepository.create({ title: 'foo', embedding: [0.1, 0.2, 0.3] }); // Sends '[0.1,0.2,0.3]'
await documentRepository.findOne({ embedding: queryVector }); // WHERE "embedding"=$1
```

## Pagination

### skip and limit

```ts
await productRepository.find().where({}).skip(20).limit(10);
```

### paginate

`paginate({ page, limit })` is shorthand for `.skip((page - 1) * limit).limit(limit)`. `page` starts at 1;
values below 1 are treated as page 1.

```ts
await productRepository.find().where({}).paginate({ page: 2, limit: 25 });
// SQL: ... LIMIT 25 OFFSET 25
```

### withCount

Get paginated results with total count in a single query using `COUNT(*) OVER()`:

```ts
const { results, totalCount } = await productRepository.find().where({ store: storeId }).sort('name').limit(10).skip(20).withCount();

const totalPages = Math.ceil(totalCount / 10);
```

## DISTINCT ON

PostgreSQL's `DISTINCT ON` returns one row per unique combination of columns:

```ts
// Most recently created product per store
const latest = await productRepository.find().distinctOn(['store']).sort('store').sort('createdAt desc');
```

Requirements:

- `ORDER BY` is required and must start with the `DISTINCT ON` columns
- Cannot be combined with `withCount()`

## Populate

`populate(propertyName, options?)` loads related entities onto the results. It is available on `find()` and
`findOne()` for any relationship defined with `model`, `collection`, or `through`
(see [Relationships](/guide/relationships)):

```ts
const product = await productRepository
  .findOne()
  .where({ id: 42 })
  .populate('store', { select: ['name'] });

// product.store is the full Store entity
console.log(product.store.name);
```

`populate()` does not use a SQL `JOIN`.
After the main query resolves, it runs a separate query per populated relation (batched by id and hydrated back onto the results), so `.join()` is not required to populate a relation.
Every matched primary row is returned whether or not the relation exists - an absent to-one is `undefined`, an empty to-many is `[]`.
The populate `where`/`limit` options constrain only the related rows, never the primary results.
Reach for [`.join()`](/guide/subqueries-and-joins#model-joins) only to constrain or sort the primary results by columns on the related table (for example, only products whose store is active).
Without such a constraint, `.populate()` on its own is all you need.

### Populate options

All options are optional and apply to the query for related rows, never to the primary results:

| Option    | Type                | Description                                                                                                            |
| --------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `select`  | `string[]`          | Columns to return on the related entities. The primary key is always included.                                         |
| `where`   | `WhereQuery`        | Filter related rows. Accepts the same operators as [`.where()`](#where-operators).                                     |
| `sort`    | `string \| object`  | Order related rows. Same syntax as [`.sort()`](#sorting).                                                              |
| `skip`    | `number`            | Skip related rows. Collections only.                                                                                   |
| `limit`   | `number`            | Maximum related rows to return. Collections only.                                                                      |
| `pool`    | `PoolLike`          | Connection pool for the populate query. Defaults to the main query's pool.                                             |
| `through` | `{ where?, sort? }` | Filter and order by junction table columns. Many-to-many relations only. See [below](#many-to-many-through-relations). |

### To-one relations

For `model` relations, `where` acts as a condition on the related row - when the row does not match, the
property is `undefined`. `skip` and `limit` are ignored.

```ts
const product = await productRepository
  .findOne()
  .where({ id: 42 })
  .populate('store', {
    select: ['name'],
    where: { isActive: true },
  });

// product.store is the Store when it is active, otherwise undefined
```

### Collections

For `collection` relations, every option applies to the related rows:

```ts
const store = await storeRepository
  .findOne()
  .where({ id: storeId })
  .populate('products', {
    select: ['name', 'sku'],
    where: { status: 'available' },
    sort: 'name asc',
    limit: 10,
  });

// store.products has at most 10 available products, sorted by name
```

Two caveats when populating collections on `find()` (multiple primary rows):

- BigAl fetches related rows for all primary rows in one query, so `limit` and `skip` apply to the combined
  set, not per primary row. For "top N per parent", populate from `findOne()` or use a
  [DISTINCT ON subquery join](/guide/subqueries-and-joins#distinct-on-in-subqueries).
- A populate `select` must include the relation's `via` property (the foreign key back to the parent).
  BigAl needs it to group rows by parent and throws if it is missing.

### Many-to-many (through) relations

For `through` relations, `through.where` filters junction rows and `through.sort` orders the populated items
by junction table columns. Item order always follows the junction query, so use `through.sort` (not `sort`)
to control ordering:

```ts
const product = await productRepository
  .findOne()
  .where({ id: productId })
  .populate('categories', {
    select: ['name'],
    where: { isActive: true }, // filters categories
    through: {
      where: { isPrimary: true }, // filters junction rows
      sort: 'ordering asc', // orders items by a junction column
    },
  });
```

### Populating multiple relations

Chain `.populate()` once per relation. The populate queries run in parallel:

```ts
const product = await productRepository
  .findOne()
  .where({ id: 42 })
  .populate('store', { select: ['name'] })
  .populate('categories', { through: { sort: 'ordering asc' } });
```

### Populate with a narrowed select

`populate()` adds the relation's foreign key column to an earlier `.select()` automatically. Call `.select()`
before `.populate()` - a later `.select()` replaces the column list and can drop the foreign key the populate
needs:

```ts
const products = await productRepository
  .find()
  .select(['name'])
  .populate('store', { select: ['name'] });
```

### Type narrowing

`.populate()` changes the property's result type from the foreign key to the populated entity, narrowed by
the populate `select` when one is given. Use `QueryResultPopulated<T, K>` to name these types - see
[Relationships > QueryResultPopulated](/guide/relationships#queryresultpopulated).

## toJSON

Return plain objects without class prototypes. Populated relations are plain objects too:

```ts
const product = await productRepository.findOne().where({ id: 42 }).toJSON();
```
