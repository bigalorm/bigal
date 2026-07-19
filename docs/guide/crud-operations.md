---
description: Create, update, and destroy records with RETURNING support, query projection, and ON CONFLICT upserts.
---

# CRUD Operations

BigAl repositories provide `create()`, `update()`, and `destroy()` methods.
`create()` and `update()` return affected records by default (using `RETURNING *`); `destroy()` does not.
All three accept `returnRecords` and `returnSelect` to shape what comes back.
Return only the columns you need, or skip the returned rows entirely, to reduce bytes over the wire and hydration cost.

## Create

### Single record

```ts
const product = await productRepository.create({
  name: 'Widget',
  priceCents: 999,
});
// product = { id: 42, name: 'Widget', priceCents: 999, createdAt: ... }
```

### Multiple records

```ts
const products = await productRepository.create([
  { name: 'Widget', priceCents: 999 },
  { name: 'Gadget', priceCents: 1499 },
]);
// products = [{ id: 42, ... }, { id: 43, ... }]
```

Passing an array builds a single multi-row `INSERT` statement, one round trip for the whole batch. Prefer this over calling
`create()` in a loop, which issues a separate `INSERT` (and round trip) per record:

```ts
// Correct — one INSERT statement for all rows
const products = await productRepository.create(items);

// Slower — a separate INSERT statement and round trip per item
const products = [];
for (const item of items) {
  products.push(await productRepository.create(item));
}
```

### Skip returning records

```ts
await productRepository.create({ name: 'Widget', priceCents: 999 }, { returnRecords: false });
```

### Query projection (returnSelect)

Return only specific columns. The primary key is always included.

```ts
const product = await productRepository.create({ name: 'Widget', priceCents: 999 }, { returnSelect: ['name'] });
// product = { id: 42, name: 'Widget' }
```

Pass an empty array to return only the primary key:

```ts
const product = await productRepository.create({ name: 'Widget', priceCents: 999 }, { returnSelect: [] });
// product = { id: 42 }
```

## onConflict (Upsert)

Handle constraint violations with PostgreSQL's `ON CONFLICT` clause.

### Ignore (DO NOTHING)

```ts
const product = await productRepository.create(
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
const product = await productRepository.create(
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
const product = await productRepository.create(
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
const products = await productRepository.update({ id: 42 }, { name: 'Super Widget' });
// products = [{ id: 42, name: 'Super Widget', ... }]

// Update multiple records
const products = await productRepository.update({ id: [42, 43] }, { priceCents: 1299 });
// products = [{ id: 42, ... }, { id: 43, ... }]
```

> `update()` always returns an array, regardless of how many records were affected.

Without returning records:

```ts
await productRepository.update({ id: 42 }, { name: 'Super Widget' }, { returnRecords: false });
```

With query projection:

```ts
const products = await productRepository.update({ id: [42, 43] }, { priceCents: 1299 }, { returnSelect: ['id'] });
// products = [{ id: 42 }, { id: 43 }]
```

## Destroy

`destroy()` takes a where clause object. Unlike `create()` and `update()`, it does not return records by default.
It emits a plain `DELETE` with no `RETURNING` clause and resolves to `void`, which is the cheapest option.

```ts
// Delete a single record (resolves to void)
await productRepository.destroy({ id: 42 });

// Delete multiple records
await productRepository.destroy({ id: [42, 43] });
```

To get the deleted rows back, opt in with `returnRecords: true`:

```ts
const products = await productRepository.destroy({ id: [42, 43] }, { returnRecords: true });
// products = [{ id: 42, ... }, { id: 43, ... }]
```

With query projection (implies `returnRecords`):

```ts
const products = await productRepository.destroy({ id: [42, 43] }, { returnSelect: ['name'] });
// products = [{ id: 42, name: 'Widget' }, { id: 43, name: 'Gadget' }]
```

> The primary key is always included. Pass an empty array to return only the primary key.
