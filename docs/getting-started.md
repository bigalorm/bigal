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
inferred from the schema definition. Column names are auto-derived from property keys using snakeCase.

```ts
import { createdAt, defineTable as table, integer, serial, text, updatedAt, varchar } from 'bigal';

export const Product = table('products', {
  id: serial().primaryKey(),
  name: text().notNull(),
  sku: varchar({ length: 100 }),
  priceCents: integer().notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
```

## Initialize repositories

Pass your table definitions and a connection pool to `initialize()`. The object-style models option
gives you typed repositories directly via destructuring:

```ts
import { initialize } from 'bigal';
import { Pool } from 'postgres-pool';
import { Product } from './Product';

const pool = new Pool('postgres://localhost/mydb');

const { Product } = initialize({
  models: { Product },
  pool,
});
```

## Run your first query

Queries use a fluent builder and are `PromiseLike` -- just `await` the chain.

```ts
// Find all products with price >= 1000 cents, sorted by name
const products = await Product.find()
  .where({ priceCents: { '>=': 1000 } })
  .sort('name asc')
  .limit(10);

// Find one product by ID
const product = await Product.findOne().where({ id: 42 });

// Count matching records
const count = await Product.count().where({ sku: { '!': null } });
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
