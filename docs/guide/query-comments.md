---
description: Tag BigAl queries with SQL comments to find them in pg_stat_statements, pg_stat_activity, and AWS Performance Insights.
---

# Query Comments

BigAl can add SQL comments to the queries it runs. Monitoring tools show the comment with the query text, so you can tell which route, job, or call site sent a slow query.

```sql
SELECT /* route=GET /stores/:id */ /* listStoreProducts */ "id","name","sku","store_id" AS "store" FROM "products" WHERE "store_id"=$1
```

There are two ways to tag queries, and you can use both:

1. **Tag one query** with `.comment()` on a read or the `comment` option on a write.
2. **Tag every query** from a request or job with the `queryComment` option on `initialize()`.

## Tag conventions

Use the same tag shapes everywhere, so one search finds every query from a route or job:

- **Requests:** `route=<METHOD> <route pattern>`, such as `route=GET /stores/:id`. Use the router's pattern, not the URL.
  A raw URL such as `/stores/42` creates a new tag for every ID and can copy user data into monitoring tools.
- **Background work:** `job=<job name>`, such as `job=nightlyReindex`.
- **One query:** Use a camelCase verb and noun that names the call site, such as `listStoreProducts`. Give each call site its own name.

Keep tags short. Performance Insights shows the first 500 bytes of each statement.

## Tag one query

### Reads

`find()`, `findOne()`, and `count()` accept `.comment()`:

```ts
const products = await productRepository.find().where({ store: storeId }).sort('name').comment('listStoreProducts');

const product = await productRepository.findOne().where({ id: productId }).comment('loadProduct');

const total = await productRepository.count().where({ store: storeId }).comment('countStoreProducts');

const { results, totalCount } = await productRepository.find().where({ store: storeId }).paginate({ page: 2, limit: 25 }).withCount().comment('pageStoreProducts');
```

`.comment()` can appear anywhere in the chain. If you call it twice, BigAl keeps the second text.

Pass the comment through `.comment()`, not inside the `find()` arguments. BigAl treats unknown keys in those arguments as where criteria, so `find({ comment: 'loadProduct' })` filters on a `comment` column.

### Populate queries

Populate queries inherit the comment from their `find()` or `findOne()`:

```ts
const store = await storeRepository.findOne().where({ id: storeId }).populate('products').comment('loadStoreWithProducts');
```

Both queries carry the tag:

```sql
SELECT /* loadStoreWithProducts */ "id","name" FROM "stores" WHERE "id"=$1 LIMIT 1
SELECT /* loadStoreWithProducts */ "id","name","sku","store_id" AS "store" FROM "products" WHERE "store_id"=$1
```

A many-to-many populate tags both the junction-table query and the related-table query.

### Writes

`create()`, `update()`, and `destroy()` accept a `comment` option:

```ts
await productRepository.create({ name: 'Widget', store: storeId }, { comment: 'createProduct' });

await productRepository.update({ id: productIds }, { sku: 'W-100' }, { comment: 'renameSkus', returnRecords: false });

await productRepository.destroy({ id: obsoleteProductIds }, { comment: 'removeObsoleteProducts' });
```

```sql
INSERT /* createProduct */ INTO "products" ("name","store_id") VALUES ($1,$2) RETURNING "id","name","sku","store_id" AS "store"
UPDATE /* renameSkus */ "products" SET "sku"=$1 WHERE "id"=ANY($2::INTEGER[])
DELETE /* removeObsoleteProducts */ FROM "products" WHERE "id"=ANY($1::INTEGER[])
```

## Tag every query from a request or job

BigAl calls `queryComment` before each repository query. It returns the text to add, or `undefined` to leave the query untagged.

Keep the tag in `AsyncLocalStorage`. Store a function rather than a string.
Frameworks match the route after your middleware runs, and BigAl calls the function when each query runs, after the route is known.

```ts
import { AsyncLocalStorage } from 'node:async_hooks';
import { initialize } from 'bigal';

// Returns the tag for the current request or job
export const queryTag = new AsyncLocalStorage<() => string | undefined>();

export const repositories = initialize({
  models,
  pool,
  queryComment: () => queryTag.getStore()?.(),
});
```

### Express

Register this middleware before your routes:

```ts
app.use((req, res, next) => {
  queryTag.run(() => (req.route ? `route=${req.method} ${req.baseUrl}${req.route.path}` : undefined), next);
});
```

This works in Express 4 and 5, including routers mounted with `app.use('/api', router)`.

Express sets `req.route` only after it matches a route. Queries in earlier middleware, such as a session lookup, run untagged.

### Fastify

```ts
fastify.addHook('onRequest', (request, reply, done) => {
  queryTag.run(() => (request.routeOptions.url ? `route=${request.method} ${request.routeOptions.url}` : undefined), done);
});
```

`request.routeOptions.url` includes plugin prefixes. Requests that match no route run untagged.

### Jobs and scripts

```ts
await queryTag.run(
  () => 'job=nightlyReindex',
  async () => reindexProducts(),
);
```

Every repository query inside the request or callback receives the tag. This includes populate queries and queries in a managed `transaction()`.
If a query also has its own comment, the `queryComment` text comes first:

```sql
SELECT /* route=GET /stores/:id */ /* loadStoreWithProducts */ "id","name" FROM "stores" WHERE "id"=$1 LIMIT 1
```

## Find tagged queries

### pg_stat_statements

`pg_stat_statements` keeps running totals for each query shape:

```sql
SELECT calls, round(total_exec_time) AS total_ms, round(mean_exec_time::numeric, 1) AS mean_ms, query
FROM pg_stat_statements
WHERE query LIKE '%/* listStoreProducts */%'
ORDER BY total_exec_time DESC;
```

`pg_stat_statements` ignores comments when it groups queries. If two tags run the same SQL, they share one row, and the `query` column shows the text that ran first.

### pg_stat_activity

`pg_stat_activity` shows queries that are running now, with their full text:

```sql
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND query LIKE '%route=GET /stores/:id%' AND pid <> pg_backend_pid();
```

### AWS Performance Insights

The Top SQL tab in Performance Insights shows the first 500 bytes of each statement by default. BigAl puts its comments after the first keyword, inside that window.

## Rules and limits

- **Placement:** Comments go immediately after the first keyword. PostgreSQL 18 drops comments that come before the first keyword from `pg_stat_statements`.
  `pg_stat_activity` cuts query text off at `track_activity_query_size`, which is 1024 bytes by default. A comment at the end of a long query may be hidden.
- **Allowed text:** Text passed to `.comment()` or the `comment` option cannot contain `/*` or `*/`. PostgreSQL nests block comments, so either sequence could change the SQL that runs.
  BigAl throws instead of running the query. It also throws when a comment is not a string.
- **Hook text:** BigAl inserts a space inside any `/*` or `*/` that `queryComment` returns. A wildcard route such as `/files/*` becomes `/files/ *` instead of failing every query in the request.
- **Order:** When a query has both types of comment, the `queryComment` text comes first.
- **Not tagged:** Raw queries that you run on a pool, `TransactionScope.query()`, and transaction statements such as `BEGIN` and `COMMIT`.
