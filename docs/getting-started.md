---
description: Install BigAl, define your first table, create a repository, and run type-safe PostgreSQL queries.
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

## Define a table

Tables are defined with the `table()` function and PostgreSQL-native column builders. Types are
inferred from the schema definition.

```ts
import { createdAt, defineTable as table, integer, serial, text, updatedAt, varchar } from 'bigal';

export const Product = table('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  sku: varchar('sku', { length: 100 }),
  priceCents: integer('price_cents').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
```

## Initialize repositories

Pass your table definitions and a connection pool to `createBigAl()`, then use `getRepository()` to
get a typed repository.

```ts
import { createBigAl } from 'bigal';
import { Pool } from 'postgres-pool';
import { Product } from './Product';

const pool = new Pool('postgres://localhost/mydb');

const bigal = createBigAl({
  models: [Product],
  pool,
});

const productRepository = bigal.getRepository(Product);
```

## Run your first query

Queries use a fluent builder and are `PromiseLike` -- just `await` the chain.

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

- [llms.txt](/llms.txt) -- structured overview
- [llms-full.txt](/llms-full.txt) -- complete documentation in a single file

## Next steps

- [Models](/guide/models) -- table definitions, column types, relationships
- [Querying](/guide/querying) -- operators, pagination, JSONB, and more
- [CRUD Operations](/guide/crud-operations) -- create, update, and destroy
- [API Reference](/reference/api) -- all exports and method signatures
- [Migrating from v15](/guide/migration-v16) -- upgrade from decorators to the new API
