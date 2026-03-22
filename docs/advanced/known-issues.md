---
description: Known issues and workarounds -- hasMany collections with populate, and query observability.
---

# Known Issues

## hasMany collections require populate

`hasMany` relationships are excluded from the select and insert types. They are only present
on query results after calling `.populate()`:

```ts
// categories is NOT on the result type
const product = await productRepository.findOne().where({ id: 42 });

// categories IS on the result type after populate
const populated = await productRepository.findOne().where({ id: 42 }).populate('categories');
```

## Query observability

Use the `onQuery` callback in `initialize()` for structured query logging:

```ts
const { Product: productRepo } = initialize({
  pool,
  models: { Product },
  onQuery({ sql, params, duration, error, model, operation }) {
    logger.debug({ sql, params, duration, model, operation });
  },
});
```

The `DEBUG_BIGAL` environment variable still works as a fallback when no `onQuery` callback is
provided:

```sh
DEBUG_BIGAL=true node app.js
```

This logs all SQL statements and parameter values to the console. Note that `params` may contain
sensitive data.
