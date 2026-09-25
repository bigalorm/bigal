---
description: Compare BigAl and Prisma ORM 7 for PostgreSQL - schema definition, migrations, JSONB, pgvector, row locks, transactions, and runtime support.
---

# BigAl vs Prisma

Prisma is a multi-database ORM with its own schema language, a generated client, and a migration tool. BigAl is a
PostgreSQL-only ORM with decorator models and a fluent query builder, and it ships no migrations. Choose Prisma for
schema-driven development across databases. Choose BigAl when you want Postgres features such as row locks and
pgvector in the typed query API.

This page compares BigAl 16 with Prisma ORM 7, the current stable release. Prisma ORM 8 is a release candidate with
general availability expected in October 2026. It adds a TypeScript runtime, a new query API, and TypeScript schema
files, and some Prisma 7 features are not yet available in it.

## At a glance

| Criterion         | BigAl                                                                      | Prisma ORM 7                                                                          |
| ----------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Databases         | PostgreSQL only                                                            | PostgreSQL, MySQL, MariaDB, SQL Server, SQLite, CockroachDB, MongoDB                  |
| Query style       | Fluent builder: `find().where({...}).sort().limit()`                       | Object arguments: `findMany({ where, orderBy, take, include })`                       |
| Schema definition | Classes with `@table` and `@column` decorators                             | `schema.prisma`; `prisma generate` writes a typed client                              |
| Migrations        | None; BigAl issues no DDL, so pair it with a migration tool                | `prisma migrate dev` and `prisma migrate deploy`, generated from the schema           |
| JSONB             | Property paths (`->`, `->>`) and `@>` containment in `.where()`            | `Json` fields with `path` filters on PostgreSQL                                       |
| DISTINCT ON       | `.distinctOn([...])`                                                       | `distinct` option; native `DISTINCT ON` behind the `nativeDistinct` preview           |
| ON CONFLICT       | `create()` option: `onConflict` with `ignore` or `merge`                   | `upsert()` uses `ON CONFLICT` when criteria are met; `createMany({ skipDuplicates })` |
| pgvector          | `vector` columns; `nearestTo` sorting and distance filters                 | `Unsupported("vector")` columns; query with `$queryRaw` or TypedSQL                   |
| Row locks         | `.lock()`: update, no key update, share, key share; `nowait`, `skipLocked` | No API; `$queryRaw` with `FOR UPDATE` in an interactive transaction                   |
| Type safety       | From class properties; `.select()` and `.populate()` narrow results        | Generated from the schema; `select` and `include` narrow results                      |
| Runtime deps      | Zero; add `postgres-pool`, `pg`, or `@neondatabase/serverless`             | `@prisma/client`, a driver adapter such as `@prisma/adapter-pg`, `prisma` CLI         |
| Runtimes          | Node.js 22.11+, Bun, Deno 2; edge runtimes untested                        | Node.js 20.19+, Bun, Deno; Cloudflare Workers and Vercel Edge in preview              |
| Transactions      | `transaction()` with isolation level and lock, statement, idle timeouts    | `$transaction()` batch or interactive; `isolationLevel`, `maxWait`, `timeout`         |
| Raw SQL           | `pool.query()`, or `query()` on the transaction scope                      | `$queryRaw` tagged templates and TypedSQL `.sql` files                                |
| Read replicas     | Built in: `readonlyPool` serves reads                                      | `@prisma/extension-read-replicas` client extension                                    |

## When to choose BigAl

- You run only PostgreSQL and want [row locks](/guide/transactions#row-locking),
  [DISTINCT ON](/guide/querying#distinct-on), [JSONB paths](/guide/querying#jsonb-querying), and
  [vector search](/guide/querying#vector-distance-queries) in the typed API instead of raw SQL.
- Your schema already lives in SQL migrations, and you want the ORM to stay out of DDL.
- You want no code generation step and no runtime dependencies beyond your Postgres driver.
- You want read replica routing without an extension. See [Configuration](/reference/configuration#read-replicas).

## When to choose Prisma

- You want one schema file to drive migrations, client types, and Prisma Studio.
- You need MySQL, SQL Server, SQLite, or MongoDB, or you may switch databases later.
- You rely on nested writes, such as creating a store and its products in one call.
- Your team prefers a large ecosystem of guides, extensions, and hosted tooling.

## Migrating from Prisma

BigAl works with the tables Prisma already created, so the database does not change. Keep `prisma migrate` for schema
changes, or move to plain SQL migrations. Prisma names tables and columns after models and fields unless you use
`@@map` and `@map`, so set `name` on `@table` and `@column` to match.

### Models

::: code-group

```prisma [Prisma]
model Product {
  id         Int    @id @default(autoincrement())
  name       String
  sku        String @unique
  priceCents Int    @map("price_cents")
  storeId    Int    @map("store_id")
  store      Store  @relation(fields: [storeId], references: [id])

  @@map("products")
}
```

```ts [BigAl]
import { column, Entity, primaryColumn, table } from 'bigal';
import type { Store } from './Store';

@table({ name: 'products' })
export class Product extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({ type: 'string', required: true })
  public name!: string;

  @column({ type: 'string', required: true })
  public sku!: string;

  @column({ type: 'integer', required: true, name: 'price_cents' })
  public priceCents!: number;

  @column({ model: () => 'Store', name: 'store_id' })
  public store!: number | Store;
}
```

:::

### Queries

::: code-group

```ts [Prisma]
const products = await prisma.product.findMany({
  where: { priceCents: { gte: 1000 }, name: { contains: 'widget', mode: 'insensitive' } },
  orderBy: { name: 'asc' },
  take: 10,
  include: { store: { select: { name: true } } },
});
```

```ts [BigAl]
const products = await productRepository
  .find()
  .where({ priceCents: { '>=': 1000 }, name: { contains: 'widget' } })
  .sort('name asc')
  .limit(10)
  .populate('store', { select: ['name'] });
```

:::

BigAl string operators such as `contains` are case-insensitive (`ILIKE`) by default.

### Row locks

::: code-group

```ts [Prisma]
await prisma.$transaction(async (tx) => {
  const [product] = await tx.$queryRaw<{ id: number; price_cents: number }[]>`
    SELECT id, price_cents FROM products WHERE sku = ${sku} FOR UPDATE`;
  // ...
});
```

```ts [BigAl]
await transaction({ pool, repositories: { Product: productRepository } }, async ({ repositories }) => {
  const product = await repositories.Product.findOne().where({ sku }).lock('update');
  // product is null when no row matches
});
```

:::

Last reviewed: September 2026
