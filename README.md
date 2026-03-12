# BigAl

[![NPM version](https://img.shields.io/npm/v/bigal.svg?style=flat)](https://npmjs.org/package/bigal)
[![node version](https://img.shields.io/node/v/bigal.svg?style=flat)](https://nodejs.org)
[![Known Vulnerabilities](https://snyk.io/test/npm/bigal/badge.svg)](https://snyk.io/test/npm/bigal)

A PostgreSQL-optimized, type-safe TypeScript ORM for Node.js. BigAl uses a fluent builder pattern for queries,
decorator-based models, and immutable query state. Built exclusively for Postgres — queries are tuned for
Postgres performance with native support for JSONB, DISTINCT ON, subquery joins, and ON CONFLICT upserts.

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

## Quick Start

```ts
import { column, primaryColumn, table, Entity, initialize, Repository } from 'bigal';
import { Pool } from 'postgres-pool';

@table({ name: 'products' })
class Product extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({ type: 'string', required: true })
  public name!: string;

  @column({ type: 'integer', required: true, name: 'price_cents' })
  public priceCents!: number;
}

const pool = new Pool('postgres://localhost/mydb');
const repos = initialize({ models: [Product], pool });
const productRepository = repos.Product as Repository<Product>;

// Fluent queries — just await the chain
const products = await productRepository
  .find()
  .where({ priceCents: { '>=': 1000 }, name: { contains: 'widget' } })
  .sort('name asc')
  .limit(10);

// Upserts with ON CONFLICT
await productRepository.create({ name: 'Widget', sku: 'WDG-001', priceCents: 999 }, { onConflict: { action: 'merge', targets: ['sku'], merge: ['priceCents'] } });
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
