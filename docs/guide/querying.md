---
description: Fluent query builder for find, findOne, and count with WHERE operators, JSONB querying, pagination, sorting, vector distance, global filters, toSQL, and populate. All results are plain objects.
---

# Querying

BigAl provides `findOne()`, `find()`, and `count()` methods on repositories. Queries use a fluent
builder pattern - each method returns a new immutable instance, and queries are `PromiseLike` so you
can `await` them directly.

## findOne

Returns a single record or `null`:

```ts
const product = await Product.findOne().where({ id: 42 });
```

### Query projection

Select specific columns:

```ts
const product = await Product.findOne({
  select: ['name', 'sku'],
}).where({ id: 42 });
```

### Pool override

Use an explicit connection pool:

```ts
const product = await Product.findOne({
  pool: poolOverride,
}).where({ id: 42 });
```

## find

Returns an array of records:

```ts
const products = await Product.find().where({ store: storeId });
```

## count

Returns the number of matching records:

```ts
const count = await Product.count().where({
  name: { like: 'Widget%' },
});
```

## Where operators

### String matching

All string operators use case-insensitive matching (`ILIKE`) and accept arrays for OR conditions.

| Operator     | Description       | SQL Pattern |
| ------------ | ----------------- | ----------- |
| `like`       | Raw ILIKE pattern | As provided |
| `contains`   | Substring match   | `%value%`   |
| `startsWith` | Prefix match      | `value%`    |
| `endsWith`   | Suffix match      | `%value`    |

```ts
await Product.find().where({ name: { contains: 'widget' } });
// SQL: WHERE name ILIKE '%widget%'

await Product.find().where({ name: { startsWith: 'Pro' } });
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
await Product.find().where({ price: { '>=': 100 } });

// Multiple operators on same field (AND)
await Product.find().where({
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
await Product.find().where({ status: { '!': 'discontinued' } });
// SQL: WHERE status <> $1

await Product.find().where({ status: { '!': ['a', 'b'] } });
// SQL: WHERE status NOT IN ($1, $2)

await Product.find().where({ deletedAt: { '!': null } });
// SQL: WHERE deleted_at IS NOT NULL
```

### OR conditions

```ts
await personRepository.find().where({
  or: [{ firstName: 'Walter' }, { lastName: 'White' }],
});
// SQL: WHERE (first_name = $1) OR (last_name = $2)
```

### Nested AND / OR

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

Note that `IS NULL` on a JSONB property is true both when the key is missing from the object and when
it is explicitly set to `null`. This matches PostgreSQL's behavior - the `->>` operator returns
`NULL` in both cases.

Properties set to `undefined` in a where clause are silently ignored (standard JavaScript -
`undefined` values are dropped by `Object.entries`). To query for missing or null properties, always
use `null` explicitly.

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

```ts
await Product.find().where({}).sort('name asc');
await Product.find().where({}).sort('name asc, createdAt desc');
```

### Object syntax

```ts
await Product.find().where({}).sort({ name: 1 }); // ASC
await Product.find().where({}).sort({ name: 1, createdAt: -1 }); // ASC, DESC
```

## Vector distance queries

BigAl supports nearest-neighbor queries on `vector()` columns using pgvector. Four distance metrics
are available: `cosine`, `l2`, `l1`, and `innerProduct`.

### Sorting by distance

Use the `nearestTo` sort to order results by vector similarity:

```ts
const similar = await documentRepo
  .find()
  .where({})
  .sort({ embedding: { nearestTo: queryVector, metric: 'cosine' } })
  .limit(10);
```

The `metric` option defaults to `'cosine'` if omitted.

| Metric         | PostgreSQL operator | Description               |
| -------------- | ------------------- | ------------------------- |
| `cosine`       | `<=>`               | Cosine distance (default) |
| `l2`           | `<->`               | Euclidean distance        |
| `l1`           | `<+>`               | Manhattan distance        |
| `innerProduct` | `<#>`               | Negative inner product    |

### Filtering by distance

Combine `nearestTo` in the where clause with a distance threshold:

```ts
const nearby = await documentRepo
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
```

## Pagination

### skip and limit

```ts
await Product.find().where({}).skip(20).limit(10);
```

### paginate

```ts
const page = 2;
const pageSize = 25;
await Product.find().where({}).paginate(page, pageSize);
```

### withCount

Get paginated results with total count in a single query using `COUNT(*) OVER()`:

```ts
const { results, totalCount } = await Product.find().where({ store: storeId }).sort('name').limit(10).skip(20).withCount();

const totalPages = Math.ceil(totalCount / 10);
```

## DISTINCT ON

PostgreSQL's `DISTINCT ON` returns one row per unique combination of columns:

```ts
// Most recently created product per store
const latest = await Product.find().distinctOn(['store']).sort('store').sort('createdAt desc');
```

Requirements:

- `ORDER BY` is required and must start with the `DISTINCT ON` columns
- Cannot be combined with `withCount()`

## Global filters

When a table defines named filters (see [Models > Global filters](/guide/models#global-filters)),
they are automatically applied to every `find` and `findOne` query. Override them per query:

```ts
// Disable all filters for this query
await Product.find().where({}).filters(false);

// Disable a specific filter
await Product.find().where({}).filters({ active: false });
```

Filters are not applied to `count()` queries.

## toSQL()

Inspect the generated SQL and parameters without executing the query:

```ts
const { sql, params } = Product.find()
  .where({ name: { contains: 'widget' } })
  .sort('name')
  .toSQL();

console.log(sql); // SELECT ... FROM "products" WHERE "name" ILIKE $1 ORDER BY ...
console.log(params); // ['%widget%']
```

Available on `find`, `findOne`, `create`, `update`, and `destroy`. Useful for debugging, logging,
and testing SQL generation.

## Populate

Load related entities:

```ts
const product = await Product.findOne()
  .where({ id: 42 })
  .populate('store', { select: ['name'] });

// product.store is the full Store entity (not just the FK number)
console.log(product.store.name);
```

All query results are plain objects - no `.toJSON()` conversion needed.
