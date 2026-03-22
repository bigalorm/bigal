# BigAl

[![NPM version](https://img.shields.io/npm/v/bigal.svg?style=flat)](https://npmjs.org/package/bigal)
[![node version](https://img.shields.io/node/v/bigal.svg?style=flat)](https://nodejs.org)
[![Known Vulnerabilities](https://snyk.io/test/npm/bigal/badge.svg)](https://snyk.io/test/npm/bigal)

A PostgreSQL-optimized, type-safe TypeScript ORM for Node.js. BigAl uses a fluent builder
pattern for queries, function-based schema definitions with PostgreSQL-native column builders,
and immutable query state. Built exclusively for Postgres with native support for JSONB,
DISTINCT ON, subquery joins, ON CONFLICT upserts, and pgvector.

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
import { initialize, defineTable as table, serial, text, integer, belongsTo, hasMany, createdAt, updatedAt } from 'bigal';
import type { Repository } from 'bigal';
import { Pool } from 'postgres-pool';

// Define models with PostgreSQL-native column builders
// Column names auto-derive from property keys (priceCents -> price_cents)
const Product = table('products', {
  id: serial().primaryKey(),
  name: text().notNull(),
  priceCents: integer().notNull(),
  store: belongsTo('Store'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

const Store = table('stores', {
  id: serial().primaryKey(),
  name: text(),
  products: hasMany('Product').via('store'),
});

// Initialize with typed destructuring -- no type assertions needed
const pool = new Pool('postgres://localhost/mydb');
const { Product, Store } = initialize({
  pool,
  models: { Product, Store },
});

// Fluent queries -- just await the chain
const products = await Product
  .find()
  .where({ priceCents: { '>=': 1000 }, name: { contains: 'widget' } })
  .sort('name asc')
  .limit(10);

// Upserts with ON CONFLICT
await Product.create({ name: 'Widget', priceCents: 999, store: 1 }, { onConflict: { action: 'merge', targets: ['name'], merge: ['priceCents'] } });

// Inspect generated SQL without executing
const { sql, params } = Product.find().where({ name: 'Widget' }).toSQL();
```

## Documentation

Full documentation is available at **[bigalorm.github.io/bigal](https://bigalorm.github.io/bigal/)**.

- [Getting Started](https://bigalorm.github.io/bigal/getting-started) -- install, first model, first query
- [Models](https://bigalorm.github.io/bigal/guide/models) -- table definitions, column types, relationships
- [Querying](https://bigalorm.github.io/bigal/guide/querying) -- operators, pagination, JSONB, DISTINCT ON
- [CRUD Operations](https://bigalorm.github.io/bigal/guide/crud-operations) -- create, update, destroy, upserts
- [Subqueries & Joins](https://bigalorm.github.io/bigal/guide/subqueries-and-joins) -- subquery builder, aggregates
- [API Reference](https://bigalorm.github.io/bigal/reference/api) -- all exports and method signatures

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
- Node.js 22 or above

## License

MIT
