# BigAl

[![NPM version](https://img.shields.io/npm/v/bigal.svg?style=flat)](https://npmjs.org/package/bigal)
[![node version](https://img.shields.io/node/v/bigal.svg?style=flat)](https://nodejs.org)
[![Known Vulnerabilities](https://snyk.io/test/npm/bigal/badge.svg)](https://snyk.io/test/npm/bigal)

A fast, lightweight ORM for PostgreSQL and Node.js, written in TypeScript.

This ORM does not:

- Create or update db schemas for you
- Do much else than basic queries, inserts, updates, and deletes

## Compatibility

- [PostgreSQL](http://www.postgresql.org/) 14 or above. Lower versions _should_ work.

## Install

```sh
npm install bigal
```

You'll also need a PostgreSQL driver. Choose one of the following:

```sh
# Option 1: postgres-pool (recommended)
npm install postgres-pool

# Option 2: node-postgres
npm install pg

# Option 3: Neon serverless
npm install @neondatabase/serverless
```

## Using Alternative PostgreSQL Drivers

BigAl is compatible with any PostgreSQL driver that implements the standard `pool.query()` method, including:

- [postgres-pool](https://www.npmjs.com/package/postgres-pool) (default)
- [pg](https://www.npmjs.com/package/pg) (node-postgres)
- [@neondatabase/serverless](https://www.npmjs.com/package/@neondatabase/serverless)

### Using with Neon Serverless

```ts
import { Pool } from '@neondatabase/serverless';
import { initialize, Repository } from 'bigal';
import { Product, Store } from './models';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const repositoriesByName = initialize({
  models: [Product, Store],
  pool,
});
```

### Using with node-postgres (pg)

```ts
import { Pool } from 'pg';
import { initialize, Repository } from 'bigal';
import { Product, Store } from './models';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const repositoriesByName = initialize({
  models: [Product, Store],
  pool,
});
```

### Type Requirements

Any pool implementation must satisfy the `PoolLike` interface:

```ts
import type { PoolLike, PoolQueryResult } from 'bigal';

interface PoolQueryResult<TRow extends Record<string, unknown>> {
  rows: TRow[];
  rowCount: number | null;
}

interface PoolLike {
  query<TRow extends Record<string, unknown> = Record<string, unknown>>(text: string, values?: readonly unknown[]): Promise<PoolQueryResult<TRow>>;
}
```

All standard PostgreSQL drivers (pg, postgres-pool, @neondatabase/serverless) satisfy this interface.

## Configuring

### Defining database models

Model definitions need to extend `Entity`.

```ts
import { column, primaryColumn, table, Entity } from 'bigal';
import { Store } from './Store';
import { Category } from './Category';
import { ProductCategory } from './ProductCategory';

@table({
  name: 'products',
})
export class Product extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({
    type: 'string',
    required: true,
  })
  public name!: string;

  @column({
    type: 'string',
  })
  public sku?: string;

  @column({
    type: 'string[]',
    defaultsTo: [],
    name: 'alias_names',
  })
  public aliases?: string[];

  @column({
    model: () => Store.name,
    name: 'store_id',
  })
  public store!: number | Store;

  @column({
    collection: () => Category.name,
    through: () => ProductCategory.name,
    via: 'product',
  })
  public categories?: Category[];
}
```

### Initialize repositories

```ts
import {
  initialize,
  Repository,
} from 'bigal';
import { Pool } from 'postgres-pool';
import {
  Category,
  Product,
  ProductCategory,
  Store,
} from './models';

let pool: Pool;
let readonlyPool: Pool;

export function startup({
  connectionString,
  readonlyConnectionString,
}: {
  connectionString: string,
  readonlyConnectionString: string,
}) {
  pool = new Pool(connectionString);
  readonlyPool = new Pool(readonlyConnectionString);

  const repositoriesByName = initialize({
    models: [
      Category,
      Product,
      ProductCategory,
      Store,
    ],
    pool,
    readonlyPool,
  });

  let categoryRepository: Repository<Category>;
  let productRepository: Repository<Category>;
  let storeRepository: Repository<Category>;
  for (const [modelName, repository] = Object.entries(repositoriesByName)) {
    switch (modelName) {
      case 'Category':
        categoryRepository = repository;
        break;
      case 'Product':
        productRepository = repository;
        break;
      case 'Store':
        storeRepository = repository;
        break;
    }
  }

  return {
    categoryRepository,
    productRepository,
    storeRepository,
  }
}

export function shutdown() {
  const shutdownEvents = [];
  if (pool) {
    shutdownEvents.push(pool.end());
  }

  if (readonlyPool) {
    shutdownEvents.push(readonlyPool.end());
  }

  return Promise.all(shutdownEvents);
}
```

## Repository class methods

### `.findOne()` - Fetch a single object

#### Fetch a single object with where criteria specified as a chained method

```ts
const item = await ProductRepository.findOne().where({
  id: context.params.id,
});
```

#### Fetch a single object and restrict columns selected from db (query projection)

```ts
const item = await ProductRepository.findOne({
  select: ['name'],
}).where({
  id: context.params.id,
});
```

#### Fetch a single object using explicit DB pool

```ts
const poolOverride = new Pool(connectionString);

const item = await ProductRepository.findOne({
  pool: poolOverride,
}).where({
  id: context.params.id,
});
```

#### Populate relation - Relations can be one-to-many (ether direction) or many-to-many

```ts
const item = await ProductRepository.findOne()
  .where({
    id: context.params.id,
  })
  .populate('store', {
    select: ['name'],
  });
```

#### Populate relation using explicit DB pool

```ts
const poolOverride = new Pool(connectionString);

const item = await ProductRepository.findOne()
  .where({
    id: context.params.id,
  })
  .populate('store', {
    select: ['name'],
    pool: poolOverride,
  });
```

#### Fetch a single object and perform a db sort before returning result

```ts
const item = await ProductRepository.findOne()
  .where({
    foo: context.params.foo,
  })
  .sort('name asc');
```

---

### `.find()` - Fetch a multiple objects

#### Fetch multiple objects with where criteria specified as a chained method

```ts
const items = await ProductRepository.find().where({
  foo: context.params.foo,
});
```

#### Fetch multiple objects and restrict columns selected from db (query projection)

```ts
const items = await ProductRepository.find({
  select: ['name'],
}).where({
  foo: context.params.foo,
});
```

#### Fetch a multiple objects using explicit DB pool

```ts
const poolOverride = new Pool(connectionString);

const item = await ProductRepository.find({
  pool: poolOverride,
}).where({
  foo: context.params.foo,
});
```

#### Example of an OR statement

```ts
const items = await PersonRepository.find().where({
  firstName: {
    like: ['walter', 'Jess%'],
  },
});
```

#### Example of an AND statement

```ts
const items = await PersonRepository.find().where({
  lastName: {
    '!': {
      lastName: [null, '', 'Whi%'],
    },
  },
});
```

#### Example of a date range (AND statement)

```ts
const items = await PersonRepository.find().where({
  createdAt: {
    '>=': startDate,
    '<': endDate,
  },
});
```

Equivalent to:

```postgresql
select id,first_name as firstName,last_name as lastName,created_at as createdAt from person where created_at >= $1 AND created_at < $2
```

#### Using `or` for OR conditions across different columns

```ts
const items = await PersonRepository.find().where({
  or: [{ firstName: 'Walter' }, { lastName: 'White' }],
});
```

Equivalent to:

```postgresql
select * from person where (first_name = $1) OR (last_name = $2)
```

#### Using `and` to combine multiple OR groups

```ts
const items = await PersonRepository.find().where({
  and: [{ or: [{ firstName: 'Walter' }, { lastName: 'White' }] }, { or: [{ firstName: 'Jesse' }, { lastName: 'Pinkman' }] }],
});
```

Equivalent to:

```postgresql
select * from person where ((first_name = $1) OR (last_name = $2)) AND ((first_name = $3) OR (last_name = $4))
```

#### Fetch multiple objects and perform a db sort before returning result

```ts
const items = await PersonRepository.find()
  .where({
    firstName: {
      like: 'walter',
    },
    lastName: {
      like: 'white',
    },
  })
  .sort({
    age: 1,
    occupation: -1,
  });
```

#### Limit number results returned

```ts
const items = await PersonRepository.find()
  .where({
    age: [22, 23, 24],
  })
  .limit(42);
```

#### Skip `x` results

```ts
const items = await FooRepository.find()
  .where({
    or: [
      {
        foo: context.params.foo,
      },
      {
        bar: context.params.foo,
      },
    ],
  })
  .skip(42);
```

#### Page results using `skip()` & `limit()`

```ts
const items = await FooRepository.find()
  .where({
    foo: context.params.foo,
  })
  .skip(84)
  .limit(42);
```

#### Page results using `paginate`

```ts
const page = 2;
const pageSize = 42;
const items = await FooRepository.find()
  .where({
    foo: context.params.foo,
  })
  .paginate(page, pageSize);
```

#### Join related tables

Use `join()` for INNER JOIN or `leftJoin()` for LEFT JOIN to filter or sort by related table columns in a single query.

```ts
// INNER JOIN - only returns products that have a store
const items = await ProductRepository.find()
  .join('store')
  .where({
    store: {
      name: 'Acme',
    },
  });
```

```ts
// LEFT JOIN - returns all products, even those without a store
const items = await ProductRepository.find()
  .leftJoin('store')
  .where({
    store: {
      name: 'Acme',
    },
  });
```

#### Join with alias

Use an alias when you need to join the same table multiple times or for clarity.

```ts
const items = await ProductRepository.find()
  .join('store', 'primaryStore')
  .where({
    primaryStore: {
      name: 'Acme',
    },
  });
```

#### Join with additional ON constraints

Add extra conditions to the JOIN's ON clause using `leftJoin()`.

```ts
const items = await ProductRepository.find()
  .leftJoin('store', 'store', {
    isDeleted: false,
  })
  .where({
    name: {
      like: 'Widget%',
    },
  });
```

#### Sort by joined table columns

Use dot notation to sort by columns on joined tables.

```ts
const items = await ProductRepository.find().join('store').sort('store.name asc');
```

#### Combine multiple where conditions

Mix regular where conditions with joined table conditions.

```ts
const items = await ProductRepository.find()
  .join('store')
  .where({
    name: {
      like: 'Widget%',
    },
    store: {
      name: {
        like: ['Acme', 'foo'],
      },
    },
  });
```

> Note: `join()` and `populate()` serve different purposes. Use `join()` when you need to filter or sort by related
> table columns in SQL. Use `populate()` when you want to fetch the full related object(s) as nested data in results.

---

#### Subqueries

Use the `subquery()` function to create subqueries for use in WHERE clauses.

##### WHERE IN with subquery

```ts
import { subquery } from 'bigal';

// Find products from active stores
const activeStoreIds = subquery(StoreRepository).select(['id']).where({ isActive: true });

const items = await ProductRepository.find().where({
  store: { in: activeStoreIds },
});
```

Equivalent SQL:

```sql
SELECT * FROM products
WHERE store_id IN (SELECT id FROM stores WHERE is_active = $1)
```

##### WHERE NOT IN with subquery

Use the existing `!` negation operator:

```ts
const discontinuedProductIds = subquery(DiscontinuedProductRepository).select(['productId']);

const items = await ProductRepository.find().where({
  id: { '!': { in: discontinuedProductIds } },
});
```

Equivalent SQL:

```sql
SELECT * FROM products
WHERE id NOT IN (SELECT product_id FROM discontinued_products)
```

##### WHERE EXISTS

```ts
// Find stores that have at least one product
const items = await StoreRepository.find().where({
  exists: subquery(ProductRepository).where({ storeId: 42 }),
});
```

Equivalent SQL:

```sql
SELECT * FROM stores
WHERE EXISTS (SELECT 1 FROM products WHERE store_id = $1)
```

##### WHERE NOT EXISTS

```ts
// Find stores with no products
const items = await StoreRepository.find().where({
  '!': {
    exists: subquery(ProductRepository).where({ storeId: 42 }),
  },
});
```

Equivalent SQL:

```sql
SELECT * FROM stores
WHERE NOT EXISTS (SELECT 1 FROM products WHERE store_id = $1)
```

##### Scalar subquery comparisons

Use aggregate methods (`count()`, `avg()`, `sum()`, `max()`, `min()`) to create scalar subqueries for comparisons:

```ts
// Find products priced above the average
const avgPrice = subquery(ProductRepository).where({ category: 'electronics' }).avg('price');

const items = await ProductRepository.find().where({
  price: { '>': avgPrice },
});
```

Equivalent SQL:

```sql
SELECT * FROM products
WHERE price > (SELECT AVG(price) FROM products WHERE category = $1)
```

##### Combining subqueries with other conditions

Subqueries can be combined with regular where conditions and other operators:

```ts
const premiumStoreIds = subquery(StoreRepository).select(['id']).where({ tier: 'premium' });

const items = await ProductRepository.find().where({
  store: { in: premiumStoreIds },
  price: { '>=': 100 },
  isActive: true,
});
```

##### Reusable subqueries

Subqueries are standalone objects that can be reused across multiple queries:

```ts
const activeStoreIds = subquery(StoreRepository).select(['id']).where({ isActive: true });

// Use in multiple queries
const products = await ProductRepository.find().where({ store: { in: activeStoreIds } });

const orders = await OrderRepository.find().where({ store: { in: activeStoreIds } });
```

---

### `.count()` - Get the number of records matching the where criteria

```ts
const count = await PersonRepository.count().where({
  name: {
    like: 'Karl',
  },
});
// count = 3
```

---

### `.create()` - Insert one or multiple objects

#### Insert a single object

```ts
const item = await PersonRepository.create({
  name: 'Karl',
});
// item = { id: 42, name: 'Karl', createdAt: ... }
```

#### Insert a single object without returning results from the db

```ts
await PersonRepository.create(
  {
    name: 'Karl',
  },
  {
    returnRecords: false,
  },
);
```

#### Insert a single object but limit columns returned from db for inserted records (query projection)

```ts
const item = await PersonRepository.create(
  {
    name: 'Karl',
  },
  {
    returnSelect: ['name'],
  },
);
// item = { id: 42, name: 'Karl' }
```

> Note: The primary key will always be included. To only return the primary key value, pass an empty array

#### Insert multiple objects

```ts
const items = await PersonRepository.create([
  {
    name: 'LX',
  },
  {
    name: 'Big Al',
  },
]);
// items = [{ id: 24, name: 'LX', createdAt: ... }, { id: 25, name: 'Big Al', createdAt: ... }]
```

#### Insert multiple objects without returning results from the db

```ts
await PersonRepository.create(
  [
    {
      name: 'LX',
    },
    {
      name: 'Big Al',
    },
  ],
  {
    returnRecords: false,
  },
);
```

#### Insert multiple objects with limited return properties

```ts
const items = await PersonRepository.create(
  [
    {
      name: 'LX',
    },
    {
      name: 'Big Al',
    },
  ],
  {
    returnSelect: ['id'],
  },
);
// items = [{ id: 24 }, { id: 25 }]
```

> Note: The primary key will always be included. To only return the primary key value, pass an empty array

---

#### Insert a single object with onConflict ignore (ON CONFLICT DO NOTHING)

```ts
const item = await PersonRepository.create(
  {
    name: 'Karl',
  },
  {
    onConflict: {
      action: 'ignore',
      targets: ['name'],
    },
  },
);
// item = { id: 42, name: 'Karl', createdAt: ... }
```

#### Insert a single object with onConflict merge (ON CONFLICT DO UPDATE) - Update all data

```ts
const item = await PersonRepository.create(
  {
    name: 'Karl',
  },
  {
    onConflict: {
      action: 'merge',
      targets: ['ssn'],
    },
  },
);
// item = { id: 42, name: 'Karl', createdAt: ... }
```

#### Insert a single object with onConflict merge (ON CONFLICT DO UPDATE) - Update specific data

```ts
const item = await PersonRepository.create(
  {
    name: 'Karl',
  },
  {
    onConflict: {
      action: 'merge',
      targets: ['ssn'],
      merge: ['name', 'age'],
    },
  },
);
// item = { id: 42, name: 'Karl', createdAt: ... }
```

### `.update()` - Update objects

#### Update single record

```ts
const items = await PersonRepository.update(
  {
    id: 42,
  },
  {
    name: 'Big Al',
  },
);
// items = [{ id: 42, name: 'Big Al', createdAt: ... }]
```

> Note: This method will return an array, regardless of how many records were affected

#### Update record without returning results from the db

```ts
await PersonRepository.update(
  {
    id: 42,
  },
  {
    name: 'Big Al',
  },
  {
    returnRecords: false,
  },
);
```

#### Update records and limit columns returned from db for affected records (query projection)

```ts
const items = await PersonRepository.update(
  {
    id: [42, 43],
  },
  {
    occupation: 'Water Purification Engineer',
  },
  {
    returnSelect: ['id'],
  },
);
// items = [{ id: 42 }, { id: 43 }]
```

---

### `.destroy()` - Delete objects from the db

#### Delete single record

```ts
const items = await PersonRepository.destroy({
  id: 42,
});
// items = [{ id: 42, name: 'Big Al', createdAt: ... }]
```

> Note: This method will return an array, regardless of how many records were affected

#### Delete record without returning row data from the db

```ts
await PersonRepository.destroy(
  {
    id: 42,
  },
  {
    returnRecords: false,
  },
);
```

#### Delete records and limit columns returned from db for affected records (query projection)

```ts
const items = await PersonRepository.destroy(
  {
    id: [24, 25],
  },
  {
    returnSelect: ['name'],
  },
);
// items = [{ id: 24, name: 'LX' }, { id: 25, name: 'Big Al' }]
```

> Note: The primary key will always be included. To only return the primary key value, pass an empty array

### Known issues

#### Entity collections must be optional

BigAl expects that all entity collection properties must be optional. There will be some type issues with QueryResult
if you make a collection non-optional.

For example:

```ts
export class Store extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({
    type: 'string',
    required: true,
  })
  public name!: string;

  // This property MUST be optional
  @column({
    collection: () => Product.name,
    via: 'store',
  })
  public products?: Product[];
}
```

#### Non-entity object arrays

If you have a JSON property, with an `id` field, on an entity model, TypeScript will probably think it is a BigAl
entity due to how the type system works. In that case, you'll want to wrap the type with `NotEntity<>`. For example:

```ts
export interface IMyJsonType {
  id: string;
  foo: string;
}

export class Product extends Entity {
  @primaryColumn({ type: 'integer' })
  public id!: number;

  @column({
    type: 'string',
    required: true,
  })
  public name!: string;

  @column({
    type: 'json',
  })
  public myJson?: NotEntity<IMyJsonType>;
}
```

### Debugging

Debugging can be enabled by passing the `DEBUG_BIGAL` environment flag with a value of `true`.

> Debugging will print the generated SQL code in the console.

## License

MIT
