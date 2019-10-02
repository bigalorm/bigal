# BigAl

[![NPM version](https://img.shields.io/npm/v/bigal.svg?style=flat)](https://npmjs.org/package/bigal)
[![node version](https://img.shields.io/node/v/bigal.svg?style=flat)](https://nodejs.org)
[![Known Vulnerabilities](https://snyk.io/test/npm/bigal/badge.svg)](https://snyk.io/test/npm/bigal)

A fast, lightweight ORM for PostgreSQL and node.js, written in Typescript. 

This ORM does not: 

* Create or update db schemas for you
* Handle associations/joins
* Do much else than basic queries, inserts, updates, and deletes

## Compatibility
- Node.js v10 or above
- [PostgreSQL](http://www.postgresql.org/) 9.6 or above

## Install

```sh
$ npm install pg postgres-pool bigal
```

## Configuring

#### Defining database models
```typescript
import { Entity } from 'bigal';
import {
  column,
  primaryColumn,
  table,
} from 'bigal/decorators';
import { Store } from './Store';
import { Category } from './Category';
import { ProductCategory } from './ProductCategory';

@table({
  name: 'products',
})
export class Product implements Entity {
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
  public categories!: Category[];
}

```

#### Initialize repositories

```typescript
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

  const repositoriesByLoweredName = initialize({
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
  for (const [loweredName, repository] = Object.entries(repositoriesByLoweredName)) {
    switch (loweredName) {
      case 'category':
        categoryRepository = repository;
        break;
      case 'product':
        productRepository = repository;
        break;
      case 'store':
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

#### Where criteria specified as a chained method

```js
const item = await ProductRepository.findOne().where({
  id: context.params.id,
});
```

#### Restrict columns selected from db (query projection)

```js
const item = await ProductRepository.findOne({
  select: ['name'],
}).where({
  id: context.params.id,
});
```

#### Populate relation - Relations can be one-to-many (ether direction) or many-to-many

```js
const item = await ProductRepository.findOne().where({
  id: context.params.id,
}).populate('store', {
  select: ['name'],
});
```

#### Sorted query before returning result

```js
const item = await ProductRepository.findOne().where({
  foo: context.params.foo,
}).sort('name asc');
```

-------------------------------------------------

### `.find()` - Fetch a multiple objects

#### Where criteria specified as a chained method

```js
const items = await ProductRepository.find().where({
  foo: context.params.foo,
});
```

#### Restrict columns selected from db (query projection)

```js
const items = await ProductRepository.find({
  select: ['name'],
}).where({
  foo: context.params.foo,
});
```

#### Sorted query before returning result

```js
const items = await PersonRepository.find().where({
  firstName: {
    like: 'walter',
  },
  lastName: {
    like: 'white',
  },
}).sort({
  age: 1,
  occupation: -1,
});
```

#### Limit number results returned

```js
const items = await PersonRepository.find().where({
  age: [22, 23, 24],
}).limit(42);
```

#### Skip `x` results

```js
const items = await FooRepository.find().where({
  or: [{
    foo: context.params.foo,
  }, {
    bar: context.params.foo,
  }]
}).skip(42);
```

#### Page results using `skip()` & `limit()`

```js
const items = await FooRepository.find().where({
  foo: context.params.foo,
}).skip(84).limit(42);
```

#### Page results using `paginate`

```js
const page = 2;
const pageSize = 42;
const items = await FooRepository.find().where({
  foo: context.params.foo,
}).paginate(page, pageSize);
```

-------------------------------------------------

### `.count()` - Get the number of records matching the where criteria

```js
const count = await PersonRepository.count().where({
  name: {
    like: 'Karl',
  },
});
// count = 3
```

-------------------------------------------------

### `.create()` - Insert one or multiple objects

#### Insert a single object

```js
const item = await PersonRepository.create({
  name: 'Karl',
});
// item = { id: 42, name: 'Karl', createdAt: ... }
```

#### Insert a single object without returning results from the db

```js
const success = await PersonRepository.create({
  name: 'Karl',
}, {
  returnRecords: false,
});
// success = true
```

#### Insert a single object but limit columns returned from db for inserted records (query projection)

```js
const item = await PersonRepository.create({
  name: 'Karl',
}, {
  returnSelect: ['name']
});
// item = { id: 42, name: 'Karl' }
```
> Note: The primary key will always be included. To only return the primary key value, pass an empty array

#### Insert a multiple object

```js
const items = await PersonRepository.create([{
  name: 'LX',
}, {
  name: 'Big Al',
}]);
// items = [{ id: 24, name: 'LX', createdAt: ... }, { id: 25, name: 'Big Al', createdAt: ... }]
```

#### Insert a multiple object without returning results from the db

```js
const success = await PersonRepository.create([{
  name: 'LX',
}, {
  name: 'Big Al',
}], {
  returnRecords: false,
});
// success = true
```

#### Insert a multiple object

```js
const items = await PersonRepository.create([{
  name: 'LX',
}, {
  name: 'Big Al',
}], {
  returnSelect: ['id']
});
// items = [{ id: 24 }, { id: 25 }]
```
> Note: The primary key will always be included. To only return the primary key value, pass an empty array

-------------------------------------------------

### `.update()` - Update objects

#### Update single record

```js
const items = await PersonRepository.update({
  id: 42,
}, {
  name: 'Big Al',
});
// items = [{ id: 42, name: 'Big Al', createdAt: ... }]
```
> Note: This method will return an array, regardless of how many records were affected


#### Update record without returning results from the db

```js
const success = await PersonRepository.update({
  id: 42,
}, {
  name: 'Big Al',
}, {
  returnRecords: false,
});
// success = true
```

#### Update records and limit columns returned from db for affected records (query projection)

```js
const items = await PersonRepository.update({
  id: [42, 43],
}, {
  occupation: 'Water Purification Engineer',
}, {
  returnSelect: ['id']
});
// items = [{ id: 42 }, { id: 43 }]
```

-------------------------------------------------

### `.destroy()` - Delete objects from the db

#### Delete single record

```js
const items = await PersonRepository.destroy({
  id: 42,
});
// items = [{ id: 42, name: 'Big Al', createdAt: ... }]
```
> Note: This method will return an array, regardless of how many records were affected


#### Delete record without returning row data from the db

```js
const success = await PersonRepository.destroy({
  id: 42,
}, {
  returnRecords: false,
});
// success = true
```

#### Delete records and limit columns returned from db for affected records (query projection)

```js
const items = await PersonRepository.destroy({
  id: [24, 25],
}, {
  returnSelect: ['name']
});
// items = [{ id: 24, name: 'LX' }, { id: 25, name: 'Big Al' }]
```
> Note: The primary key will always be included. To only return the primary key value, pass an empty array



## License
MIT
