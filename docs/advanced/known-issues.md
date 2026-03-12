# Known Issues

## Entity collections must be optional

Collection properties (one-to-many, many-to-many) must be declared as optional. They are only present after `.populate()` and will cause `QueryResult` type errors if required:

```ts
// Correct
@column({ collection: () => 'Product', via: 'store' })
public products?: Product[];

// Incorrect — causes type issues
@column({ collection: () => 'Product', via: 'store' })
public products!: Product[];
```

## Non-entity objects with id fields

If a JSON column contains objects with an `id` property, TypeScript may mistake them for BigAl entities. Wrap the type with `NotEntity<T>`:

```ts
import type { NotEntity } from 'bigal';

interface IMyJsonType {
  id: string;
  foo: string;
}

@column({ type: 'json' })
public metadata?: NotEntity<IMyJsonType>;
```

Without `NotEntity`, BigAl's type system treats the type as an entity relationship, which leads to incorrect type narrowing in `QueryResult`.

## Debugging queries

Set the `DEBUG_BIGAL` environment variable to see generated SQL:

```sh
DEBUG_BIGAL=true node app.js
```

This logs all SQL statements and parameter values to the console.
