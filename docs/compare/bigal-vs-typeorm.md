---
description: Compare BigAl and TypeORM 1.x for PostgreSQL - decorator models, migrations, JSONB, pgvector, row locks, type safety, and dependencies.
---

# BigAl vs TypeORM

TypeORM and BigAl both define models as decorated TypeScript classes. TypeORM supports 10 databases, the Active Record
and Data Mapper patterns, and generated migrations. BigAl supports only PostgreSQL and has no migration tooling. In
exchange, it puts Postgres features such as JSONB paths and pgvector distance queries in its typed query API.

This page compares BigAl 16 with TypeORM 1.1, the current stable release. TypeORM 1.0 shipped in May 2026.

## At a glance

| Criterion         | BigAl                                                                      | TypeORM 1.1                                                                       |
| ----------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Databases         | PostgreSQL only                                                            | 10, including PostgreSQL, MySQL, SQL Server, Oracle, SQLite, and MongoDB          |
| Query style       | Fluent builder: `find().where({...}).sort().limit()`                       | `find({ where, order, take, relations })`, plus `createQueryBuilder()`            |
| Schema definition | Classes with `@table` and `@column`; no `reflect-metadata` needed          | `@Entity` classes or `EntitySchema`; needs `reflect-metadata`                     |
| Migrations        | None; BigAl issues no DDL, so pair it with a migration tool                | CLI `migration:generate`, `migration:run`, `migration:revert`; `synchronize`      |
| JSONB             | Property paths (`->`, `->>`) and `@>` containment in `.where()`            | `jsonb` columns and a `JsonContains` operator; paths via QueryBuilder SQL         |
| DISTINCT ON       | `.distinctOn([...])`                                                       | QueryBuilder `.distinctOn([...])`                                                 |
| ON CONFLICT       | `create()` option: `onConflict` with `ignore` or `merge`                   | `upsert(values, ['sku'])`; QueryBuilder `.orIgnore()` and `.orUpdate()`           |
| pgvector          | `vector` columns; `nearestTo` sorting and distance filters                 | `vector` and `halfvec` column types; distance queries through raw SQL             |
| Row locks         | `.lock()`: update, no key update, share, key share; `nowait`, `skipLocked` | `.setLock()` modes include `for_no_key_update`, `for_key_share`; `.setOnLocked()` |
| Relation typing   | `number \| Store`, narrowed to `Store` by `.populate()`                    | `store: Store` whether or not the relation was loaded                             |
| Lifecycle hooks   | Static `beforeCreate` and `beforeUpdate` on the model                      | `@BeforeInsert`, `@AfterLoad`, and other listeners, plus subscribers              |
| Runtime deps      | Zero; add `postgres-pool`, `pg`, or `@neondatabase/serverless`             | 10, including `reflect-metadata`, `dayjs`, `debug`, and `yargs`                   |
| Runtimes          | Node.js 22.11+, Bun, Deno 2; edge runtimes untested                        | Node.js 20+; Bun and Deno are not on its supported-platforms page                 |
| Transactions      | `transaction()` with isolation level and lock, statement, idle timeouts    | `dataSource.transaction()` with isolation level; `QueryRunner` for manual control |
| Raw SQL           | `pool.query()`, or `query()` on the transaction scope                      | `dataSource.query(sql, params)` and the `dataSource.sql` template                 |

## When to choose BigAl

- You want relation types that tell you whether a relation was loaded. BigAl types a foreign key as `number | Store`
  and narrows it after [`.populate()`](/guide/relationships).
- You want [JSONB property filters](/guide/querying#jsonb-querying) and
  [vector search](/guide/querying#vector-distance-queries) without dropping to QueryBuilder SQL.
- You want fewer moving parts: no `reflect-metadata`, no `emitDecoratorMetadata`, and zero runtime dependencies.
- You run on Bun or Deno as well as Node.js.

## When to choose TypeORM

- You need a database other than PostgreSQL, or several at once.
- You want migrations generated from entity changes.
- You use the Active Record pattern, or a framework integration such as NestJS's TypeORM module.
- You need entity listeners and subscribers beyond before-create and before-update hooks.
- You target React Native, NativeScript, or the browser with SQLite, which TypeORM documents.

## Migrating from TypeORM

The model code looks similar, because both use decorators on classes. Relations change the most. TypeORM's
`@ManyToOne` with `@JoinColumn` becomes a `model` column that holds the foreign key, and `relations: { store: true }`
becomes `.populate('store')`. BigAl works with the existing tables, and you can keep TypeORM's migrations or move to
plain SQL files.

### Models

::: code-group

```ts [TypeORM]
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'products' })
export class Product {
  @PrimaryGeneratedColumn()
  public id!: number;

  @Column()
  public name!: string;

  @Column({ unique: true })
  public sku!: string;

  @Column({ name: 'price_cents' })
  public priceCents!: number;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  public store!: Store;
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

```ts [TypeORM]
const products = await dataSource.getRepository(Product).find({
  where: { priceCents: MoreThanOrEqual(1000), name: ILike('%widget%') },
  order: { name: 'ASC' },
  take: 10,
  relations: { store: true },
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

Last reviewed: September 2026
