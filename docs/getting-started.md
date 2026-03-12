---
description: Install BigAl, define your first model with decorators, initialize a repository, and run type-safe PostgreSQL queries.
---

# Getting Started

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

## Define a model

Models extend `Entity` and use decorators to map to database tables.

```ts
import { column, primaryColumn, table, Entity } from 'bigal';

@table({ name: 'products' })
export class Product extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({ type: 'string', required: true })
  public name!: string;

  @column({ type: 'string' })
  public sku?: string;

  @column({ type: 'integer', required: true, name: 'price_cents' })
  public priceCents!: number;
}
```

## Initialize repositories

Pass your models and a connection pool to `initialize()`. It returns a map of repositories keyed by model name.

```ts
import { initialize, Repository } from 'bigal';
import { Pool } from 'postgres-pool';
import { Product } from './Product';

const pool = new Pool('postgres://localhost/mydb');

const repos = initialize({
  models: [Product],
  pool,
});

const productRepository = repos.Product as Repository<Product>;
```

## Run your first query

Queries use a fluent builder and are `PromiseLike` — just `await` the chain.

```ts
// Find all products with price >= 1000 cents, sorted by name
const products = await productRepository
  .find()
  .where({ priceCents: { '>=': 1000 } })
  .sort('name asc')
  .limit(10);

// Find one product by ID
const product = await productRepository.findOne().where({ id: 42 });

// Count matching records
const count = await productRepository.count().where({ sku: { '!': null } });
```

## Using with AI assistants

BigAl provides an agent skill for AI-powered development tools. Install it in your project to give
your AI assistant BigAl-specific guidance:

```sh
npx skills add bigalorm/bigal
```

Machine-readable documentation is also available:

- [llms.txt](/llms.txt) — structured overview
- [llms-full.txt](/llms-full.txt) — complete documentation in a single file

## Next steps

- [Models](/guide/models) — decorators, relationships, and Entity types
- [Querying](/guide/querying) — operators, pagination, JSONB, and more
- [CRUD Operations](/guide/crud-operations) — create, update, and destroy
- [API Reference](/reference/api) — all exports and method signatures
