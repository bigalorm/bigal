# CRUD Operations

BigAl repositories provide `create()`, `update()`, and `destroy()` methods. All three return affected records
by default (using `RETURNING *`), and all support `returnRecords` and `returnSelect` options.

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

`destroy()` takes a where clause object. Returns an array of deleted records.

```ts
// Delete a single record
const products = await productRepository.destroy({ id: 42 });
// products = [{ id: 42, name: 'Super Widget', ... }]

// Delete multiple records
const products = await productRepository.destroy({ id: [42, 43] });
```

> `destroy()` always returns an array, regardless of how many records were affected.

Without returning records:

```ts
await productRepository.destroy({ id: 42 }, { returnRecords: false });
```

With query projection:

```ts
const products = await productRepository.destroy({ id: [42, 43] }, { returnSelect: ['name'] });
// products = [{ id: 42, name: 'Widget' }, { id: 43, name: 'Gadget' }]
```

> The primary key is always included. Pass an empty array to return only the primary key.
