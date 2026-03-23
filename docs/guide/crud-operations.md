---
description: Create, update, and destroy records with RETURNING support, query projection, toSQL, and ON CONFLICT upserts.
---

# CRUD Operations

BigAl repositories provide `create()`, `update()`, and `destroy()` methods. All three return affected
records by default (using `RETURNING *`), and all support `returnRecords` and `returnSelect` options.
Results are always plain objects.

## Create

### Single record

```ts
const product = await Product.create({
  name: 'Widget',
  priceCents: 999,
});
// product = { id: 42, name: 'Widget', priceCents: 999, createdAt: ... }
```

### Multiple records

```ts
const products = await Product.create([
  { name: 'Widget', priceCents: 999 },
  { name: 'Gadget', priceCents: 1499 },
]);
// products = [{ id: 42, ... }, { id: 43, ... }]
```

### Skip returning records

```ts
await Product.create({ name: 'Widget', priceCents: 999 }, { returnRecords: false });
```

### Query projection (returnSelect)

Return only specific columns. The primary key is always included.

```ts
const product = await Product.create({ name: 'Widget', priceCents: 999 }, { returnSelect: ['name'] });
// product = { id: 42, name: 'Widget' }
```

Pass an empty array to return only the primary key:

```ts
const product = await Product.create({ name: 'Widget', priceCents: 999 }, { returnSelect: [] });
// product = { id: 42 }
```

## onConflict (Upsert)

Handle constraint violations with PostgreSQL's `ON CONFLICT` clause.

### Ignore (DO NOTHING)

```ts
const product = await Product.create(
  { name: 'Widget', sku: 'WDG-001' },
  {
    onConflict: {
      action: 'ignore',
      targets: ['sku'],
    },
  },
);
```

### Merge (DO UPDATE) - all columns

```ts
const product = await Product.create(
  { name: 'Widget', sku: 'WDG-001', priceCents: 999 },
  {
    onConflict: {
      action: 'merge',
      targets: ['sku'],
    },
  },
);
```

### Merge - specific columns

```ts
const product = await Product.create(
  { name: 'Widget', sku: 'WDG-001', priceCents: 999 },
  {
    onConflict: {
      action: 'merge',
      targets: ['sku'],
      merge: ['name', 'priceCents'],
    },
  },
);
```

## Update

`update()` takes a where clause object and a values object. Returns an array of affected records.

```ts
// Update a single record
const products = await Product.update({ id: 42 }, { name: 'Super Widget' });
// products = [{ id: 42, name: 'Super Widget', ... }]

// Update multiple records
const products = await Product.update({ id: [42, 43] }, { priceCents: 1299 });
// products = [{ id: 42, ... }, { id: 43, ... }]
```

> `update()` always returns an array, regardless of how many records were affected.

Without returning records:

```ts
await Product.update({ id: 42 }, { name: 'Super Widget' }, { returnRecords: false });
```

With query projection:

```ts
const products = await Product.update({ id: [42, 43] }, { priceCents: 1299 }, { returnSelect: ['id'] });
// products = [{ id: 42 }, { id: 43 }]
```

## Destroy

`destroy()` takes a where clause object. Returns `void` by default.

```ts
// Delete records (returns void)
await Product.destroy({ id: 42 });
await Product.destroy({ id: [42, 43] });
```

With returning records:

```ts
const products = await Product.destroy({ id: 42 }, { returnRecords: true });
// products = [{ id: 42, name: 'Super Widget', ... }]
```

With query projection:

```ts
const products = await Product.destroy({ id: [42, 43] }, { returnSelect: ['name'] });
// products = [{ id: 42, name: 'Widget' }, { id: 43, name: 'Gadget' }]
```

> The primary key is always included when returning records. Pass an empty array to return only the
> primary key.

## toSQL() on mutations

All mutation operations support `toSQL()` to inspect the generated SQL without executing:

```ts
// Create
const { sql, params } = Product.create({ name: 'Widget', priceCents: 999 }).toSQL();

// Update
const { sql, params } = Product.update({ id: 42 }, { name: 'Super Widget' }).toSQL();

// Destroy
const { sql, params } = Product.destroy({ id: 42 }).toSQL();
```

This is useful for debugging, logging, and testing SQL generation.

## Initialization example

```ts
import { initialize, defineTable as table, serial, text, integer, createdAt, updatedAt } from 'bigal';
import { Pool } from 'postgres-pool';

const Product = table('products', {
  id: serial().primaryKey(),
  name: text().notNull(),
  priceCents: integer().notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

const pool = new Pool('postgres://localhost/mydb');
const { Product } = initialize({ models: { Product }, pool });
```
