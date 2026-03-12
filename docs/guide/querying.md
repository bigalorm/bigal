# Querying

BigAl provides `findOne()`, `find()`, and `count()` methods on repositories. Queries use a fluent builder pattern —
each method returns a new immutable instance, and queries are `PromiseLike` so you can `await` them directly.

## findOne

Returns a single record or `null`:

```ts
const product = await productRepository.findOne().where({ id: 42 });
```

### Query projection

Select specific columns:

```ts
const product = await productRepository
  .findOne({
    select: ['name', 'sku'],
  })
  .where({ id: 42 });
```

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
await productRepository.find().where({}).sort('name asc');
await productRepository.find().where({}).sort('name asc, createdAt desc');
```

### Object syntax

```ts
await productRepository.find().where({}).sort({ name: 1 }); // ASC
await productRepository.find().where({}).sort({ name: 1, createdAt: -1 }); // ASC, DESC
```

## Pagination

### skip and limit

```ts
await productRepository.find().where({}).skip(20).limit(10);
```

### paginate

```ts
const page = 2;
const pageSize = 25;
await productRepository.find().where({}).paginate(page, pageSize);
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

Load related entities:

```ts
const product = await productRepository
  .findOne()
  .where({ id: 42 })
  .populate('store', { select: ['name'] });

// product.store is the full Store entity
console.log(product.store.name);
```

## toJSON

Return plain objects without class prototypes:

```ts
const product = await productRepository.findOne().where({ id: 42 }).toJSON();
```
