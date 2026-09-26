---
description: Compare BigAl and Drizzle ORM for PostgreSQL - query style, schema definition, migrations, JSONB, pgvector, row locks, and runtimes.
---

# BigAl vs Drizzle

Drizzle is a TypeScript ORM with SQL-shaped queries for PostgreSQL, MySQL, and SQLite. Schemas are TypeScript table
definitions, and the drizzle-kit CLI generates migrations. BigAl is a PostgreSQL-only ORM with decorator models, a
repository API, and no migration tooling. Choose Drizzle for SQL-shaped queries and built-in migrations. Choose BigAl
for repository-style queries with Postgres features built in.

This page compares BigAl 16 with Drizzle ORM 0.45, the current stable release. Drizzle 1.0 is in beta.

## At a glance

| Criterion         | BigAl                                                                      | Drizzle ORM 0.45                                                                     |
| ----------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Databases         | PostgreSQL only                                                            | PostgreSQL, MySQL, SQLite, and hosted variants such as Neon, Turso, and D1           |
| Query style       | Fluent builder: `find().where({...}).sort().limit()`                       | SQL-like `db.select().from(t).where(gte(t.price, 100))`; relational `db.query`       |
| Schema definition | Classes with `@table` and `@column` decorators                             | `pgTable()` definitions; types inferred with `$inferSelect`                          |
| Migrations        | None; BigAl issues no DDL, so pair it with a migration tool                | drizzle-kit `generate`, `migrate`, `push`, and `pull` (introspection)                |
| Relationships     | `model`, `collection`, `through`; loaded with `.populate()`                | Declared with `relations()`; relational queries load them with `with`                |
| JSONB             | Property paths (`->`, `->>`) and `@>` containment in `.where()`            | `jsonb().$type<T>()` columns; filter inside JSON with the `sql` template             |
| DISTINCT ON       | `.distinctOn([...])`                                                       | `db.selectDistinctOn([...])`                                                         |
| ON CONFLICT       | `create()` option: `onConflict` with `ignore` or `merge`                   | `.onConflictDoNothing()` and `.onConflictDoUpdate({ target, set })`                  |
| pgvector          | `vector` columns; `nearestTo` sorting and distance filters                 | `vector()` columns; `cosineDistance`, `l2Distance`, `innerProduct`; HNSW indexes     |
| Row locks         | `.lock()`: update, no key update, share, key share; `nowait`, `skipLocked` | `.for('update')`, also `no key update`, `share`, `key share`; `noWait`, `skipLocked` |
| Lifecycle hooks   | Static `beforeCreate` and `beforeUpdate` on the model                      | None; column-level `$defaultFn` and `$onUpdate`                                      |
| Type safety       | From class properties; `.select()` and `.populate()` narrow results        | Inferred from table definitions; selected fields shape each result                   |
| Runtime deps      | Zero; add `postgres-pool`, `pg`, or `@neondatabase/serverless`             | Zero; add a driver such as `pg`, `postgres`, or `@neondatabase/serverless`           |
| Runtimes          | Node.js 22.11+, Bun, Deno 2; edge runtimes untested                        | Node.js, Bun, Deno, and edge runtimes with HTTP or WebSocket drivers                 |
| Transactions      | `transaction()` with isolation level and lock, statement, idle timeouts    | `db.transaction()` with isolation level and access mode; nested savepoints           |
| Raw SQL           | `pool.query()`, or `query()` on the transaction scope                      | `sql` template inside any query, or `db.execute(sql...)`                             |

## When to choose BigAl

- You prefer a repository API with object filters over composing SQL operators such as `eq()` and `and()`.
- You want [JSONB property filters](/guide/querying#jsonb-querying) in the typed API instead of `sql` fragments.
- You want model-level `beforeCreate` and `beforeUpdate` hooks.
- Your schema already lives in SQL migrations, and you want the ORM to stay out of DDL.
- You want [read replica routing](/reference/configuration#read-replicas) built in.

## When to choose Drizzle

- You want queries that read like SQL, with CTEs (`$with()`) and set operations such as `union()` in the builder.
- You want migrations generated from your TypeScript schema, or introspection of an existing database.
- You need MySQL or SQLite, or a hosted database such as Turso or Cloudflare D1.
- You deploy to edge runtimes and want a documented path for each driver.

## Migrating from Drizzle

BigAl works with the tables Drizzle created, so the database does not change. Keep drizzle-kit for migrations, or move
to plain SQL files. Drizzle joins return flat rows you shape yourself; BigAl's `.populate()` attaches related records
to each result instead.

### Models

::: code-group

```ts [Drizzle]
import { integer, pgTable, serial, text } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  sku: text('sku').notNull().unique(),
  priceCents: integer('price_cents').notNull(),
  storeId: integer('store_id')
    .notNull()
    .references(() => stores.id),
});
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

### Queries and upserts

::: code-group

```ts [Drizzle]
const rows = await db
  .select({ id: products.id, name: products.name, storeName: stores.name })
  .from(products)
  .innerJoin(stores, eq(products.storeId, stores.id))
  .where(and(gte(products.priceCents, 1000), ilike(products.name, '%widget%')))
  .orderBy(asc(products.name))
  .limit(10);

await db
  .insert(products)
  .values({ sku: 'WDG-001', name: 'Widget', priceCents: 999, storeId: 1 })
  .onConflictDoUpdate({ target: products.sku, set: { priceCents: sql`excluded.price_cents` } });
```

```ts [BigAl]
const products = await productRepository
  .find()
  .where({ priceCents: { '>=': 1000 }, name: { contains: 'widget' } })
  .sort('name asc')
  .limit(10)
  .populate('store', { select: ['name'] });

await productRepository.create({ sku: 'WDG-001', name: 'Widget', priceCents: 999, store: 1 }, { onConflict: { action: 'merge', targets: ['sku'], merge: ['priceCents'] } });
```

:::

Last reviewed: September 2026
