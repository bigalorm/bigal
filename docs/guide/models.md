---
description: Define PostgreSQL tables as TypeScript classes with decorators for columns, primary keys, relationships, and automatic timestamps.
---

# Models

Models map TypeScript classes to PostgreSQL tables. Every model extends `Entity` and uses decorators for table and column configuration.

## Table decorator

Use `@table()` to bind a class to a database table:

```ts
import { table, Entity } from 'bigal';

@table({ name: 'products' })
export class Product extends Entity {
  // columns go here
}
```

Options:

| Option       | Type      | Description                                              |
| ------------ | --------- | -------------------------------------------------------- |
| `name`       | `string`  | Database table or view name                              |
| `schema`     | `string`  | PostgreSQL schema (default: `public`)                    |
| `readonly`   | `boolean` | If `true`, `initialize()` returns a `ReadonlyRepository` |
| `connection` | `string`  | Named connection key (for multi-database setups)         |

## Column decorators

### `@primaryColumn()`

Marks the primary key column:

```ts
import { primaryColumn } from 'bigal';

@primaryColumn({ type: 'integer' })
public id!: number;
```

### `@column()`

Defines a regular column:

```ts
import { column } from 'bigal';

@column({ type: 'string', required: true })
public name!: string;

@column({ type: 'string' })
public sku?: string;
```

### `@createDateColumn()`

Automatically set on insert:

```ts
import { createDateColumn } from 'bigal';

@createDateColumn()
public createdAt!: Date;
```

### `@updateDateColumn()`

Automatically set on update:

```ts
import { updateDateColumn } from 'bigal';

@updateDateColumn()
public updatedAt!: Date;
```

### `@versionColumn()`

Auto-incrementing version for optimistic locking:

```ts
import { versionColumn } from 'bigal';

@versionColumn()
public version!: number;
```

## Column options

| Option       | Type           | Description                                                                                                                                             |
| ------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`       | `string`       | Column type: `'string'`, `'integer'`, `'float'`, `'boolean'`, `'date'`, `'datetime'`, `'json'`, `'string[]'`, `'integer[]'`, `'float[]'`, `'boolean[]'` |
| `name`       | `string`       | Database column name (if different from property name)                                                                                                  |
| `required`   | `boolean`      | If `true`, value must not be null                                                                                                                       |
| `defaultsTo` | `any`          | Default value                                                                                                                                           |
| `model`      | `() => string` | Foreign key relationship (many-to-one)                                                                                                                  |
| `collection` | `() => string` | Inverse relationship (one-to-many or many-to-many)                                                                                                      |
| `through`    | `() => string` | Join table for many-to-many                                                                                                                             |
| `via`        | `string`       | Property on related model that holds the foreign key                                                                                                    |

## Relationships

### Many-to-one

Use `model` when the current entity holds the foreign key:

```ts
import { column, Entity, primaryColumn, table } from 'bigal';
import type { Store } from './Store';

@table({ name: 'products' })
export class Product extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({ model: () => 'Store', name: 'store_id' })
  public store!: number | Store;
}
```

The property type is `number | Store` — it holds the foreign key when not populated, or the full entity after `.populate()`.

### One-to-many

Use `collection` on the inverse side:

```ts
@column({ collection: () => 'Product', via: 'store' })
public products?: Product[];
```

Collections **must** be optional (`?`) since they are only present after `.populate()`.

### Many-to-many

Use `collection` with `through` for join tables:

```ts
@column({
  collection: () => 'Category',
  through: () => 'ProductCategory',
  via: 'product',
})
public categories?: Category[];
```

See [Relationships](/guide/relationships) for complete examples including join tables and self-referencing models.

## Entity base class

All models extend `Entity`, which provides no properties by itself — it serves as a marker for BigAl's type system to distinguish ORM entities from plain objects.

## NotEntity\<T\>

If a JSON column contains objects with an `id` field, TypeScript may mistake them for BigAl entities. Wrap the type with `NotEntity<T>`:

```ts
import type { NotEntity } from 'bigal';

interface IMyJsonType {
  id: string;
  foo: string;
}

@column({ type: 'json' })
public metadata?: NotEntity<IMyJsonType>;
```
