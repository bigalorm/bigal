# BigAl

[![NPM version](https://img.shields.io/npm/v/bigal.svg?style=flat)](https://npmjs.org/package/bigal)
[![node version](https://img.shields.io/node/v/bigal.svg?style=flat)](https://nodejs.org)
[![Known Vulnerabilities](https://snyk.io/test/npm/bigal/badge.svg)](https://snyk.io/test/npm/bigal)

A PostgreSQL-optimized, type-safe TypeScript ORM for Node.js. BigAl uses a fluent builder
pattern for queries, function-based schema definitions with PostgreSQL-native column builders,
and immutable query state. Built exclusively for Postgres with native support for JSONB,
DISTINCT ON, subquery joins, and ON CONFLICT upserts.

## Install

```sh
npm install bigal
```

You also need a PostgreSQL driver:

```sh
# Option 1: postgres-pool (recommended)
npm install postgres-pool

# Option 2: node-postgres
npm install pg

# Option 3: Neon serverless
npm install @neondatabase/serverless
```

Requires Node.js >= 22.

## Quick Start

```ts
import { createBigAl, defineTable as table, serial, text, integer, belongsTo, hasMany, createdAt, updatedAt } from 'bigal';
import type { InferSelect } from 'bigal';
import { Pool } from 'postgres-pool';

// Define models with PostgreSQL-native column builders
const Product = table('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  priceCents: integer('price_cents').notNull(),
  store: belongsTo(() => Store, 'store_id'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

const Store = table('stores', {
  id: serial('id').primaryKey(),
  name: text('name'),
  products: hasMany(() => Product).via('store'),
});

// Types inferred from schema — no separate interface needed
type ProductRow = InferSelect<typeof Product._schema>;

// Initialize and get typed repositories
const pool = new Pool('postgres://localhost/mydb');
const bigal = createBigAl({ pool, models: [Product, Store] });
const productRepo = bigal.getRepository(Product);

// Fluent queries — just await the chain
const products = await productRepo
  .find()
  .where({ priceCents: { '>=': 1000 }, name: { contains: 'widget' } })
  .sort('name asc')
  .limit(10);

// Upserts with ON CONFLICT
await productRepo.create({ name: 'Widget', priceCents: 999, store: 1 }, { onConflict: { action: 'merge', targets: ['name'], merge: ['priceCents'] } });
```

## Documentation

Full documentation is available at **[bigalorm.github.io/bigal](https://bigalorm.github.io/bigal/)**.

- [Getting Started](https://bigalorm.github.io/bigal/getting-started) — install, first model, first query
- [Models](https://bigalorm.github.io/bigal/guide/models) — decorators, column options, relationships
- [Querying](https://bigalorm.github.io/bigal/guide/querying) — operators, pagination, JSONB, DISTINCT ON
- [CRUD Operations](https://bigalorm.github.io/bigal/guide/crud-operations) — create, update, destroy, upserts
- [Subqueries & Joins](https://bigalorm.github.io/bigal/guide/subqueries-and-joins) — subquery builder, aggregates
- [API Reference](https://bigalorm.github.io/bigal/reference/api) — all exports and method signatures

## Machine-Readable Documentation

BigAl provides machine-readable documentation for LLMs and AI-powered tools:

| Resource      | URL                                                                                      |
| ------------- | ---------------------------------------------------------------------------------------- |
| llms.txt      | [bigalorm.github.io/bigal/llms.txt](https://bigalorm.github.io/bigal/llms.txt)           |
| llms-full.txt | [bigalorm.github.io/bigal/llms-full.txt](https://bigalorm.github.io/bigal/llms-full.txt) |

### Agent skill

Install the BigAl agent skill for AI-assisted development:

```sh
npx skills add bigalorm/bigal
```

## Compatibility

- [PostgreSQL](http://www.postgresql.org/) 14 or above
- Node.js 20.11.0 or above

## License

MIT
