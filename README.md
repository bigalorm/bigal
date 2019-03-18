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
- Node.js 8.10 or above
- [PostgreSQL](http://www.postgresql.org/) 9.6 or above

## Install

```sh
$ npm install pg postgres-pool bigal
```

## Configuring

#### Load schema definition files
> Load model schema definition files from a directory and create global repositories for each model

```js
const _ = require('lodash');
const fs = require('mz/fs');
const path = require('path');
const { Pool } = require('postgres-pool');
const bigal = require('bigal');

let pool;
let readonlyPool;

module.exports = {
  async startup({
    connectionString,
    readonlyConnectionString,
  }) {
    const models = {};
    pool = new Pool(connectionString);
    readonlyPool = new Pool(readonlyConnectionString);

    const modelsPath = path.join(__dirname, 'src/models');
    const files = await fs.readdir(modelsPath);
    const modelSchemas = files.filter((file) => /.(js|ts)$/i.test(file)).map((file) => {
      const fileBasename = path.basename(file, '.js');
      const schema = require(`${modelsPath}/${fileBasename}`);

      return _.merge({
        globalId: fileBasename,
        tableName: fileBasename.toLowerCase(),
      }, schema);
    });

    await bigal.initialize({
      modelSchemas,
      pool,
      readonlyPool,
      expose(repository, modelSchema) {
        global[modelSchema.globalId] = repository;
        models[modelSchema.globalId] = repository;
      },
    });
    
    return models;
  },
  shutdown() {
    return Promise.all([
      pool.end(),
      readonlyPool.end(),
    ]);
  },
};
```

## Model class methods

### `.findOne()` - Fetch a single object

#### Where criteria specified as a chained method

```js
const item = await MyModel.findOne().where({
  id: context.params.id,
});
```

#### Restrict columns selected from db (query projection)

```js
const item = await MyModel.findOne({
  select: ['name'],
}).where({
  id: context.params.id,
});
```

#### Populate relation - Relations can be one-to-many (ether direction) or many-to-many

```js
const item = await MyModel.findOne().where({
  id: context.params.id,
}).populate('parent', {
  select: ['name'],
});
```

#### Sorted query before returning result

```js
const item = await MyModel.findOne().where({
  foo: context.params.foo,
}).sort('name asc');
```

-------------------------------------------------

### `.find()` - Fetch a multiple objects

#### Where criteria specified as a chained method

```js
const items = await MyModel.find().where({
  foo: context.params.foo,
});
```

#### Restrict columns selected from db (query projection)

```js
const items = await MyModel.find({
  select: ['name'],
}).where({
  foo: context.params.foo,
});
```

#### Sorted query before returning result

```js
const items = await MyModel.find().where({
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
const items = await MyModel.find().where({
  age: [22, 23, 24],
}).limit(42);
```

#### Skip `x` results

```js
const items = await MyModel.find().where({
  or: [{
    foo: context.params.foo,
  }, {
    bar: context.params.foo,
  }]
}).skip(42);
```

#### Page results using `skip()` & `limit()`

```js
const items = await MyModel.find().where({
  foo: context.params.foo,
}).skip(84).limit(42);
```

#### Page results using `paginate`

```js
const page = 2;
const pageSize = 42;
const items = await MyModel.find().where({
  foo: context.params.foo,
}).paginate(page, pageSize);
```

-------------------------------------------------

### `.count()` - Get the number of records matching the where criteria

```js
const count = await MyModel.count().where({
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
const item = await MyModel.create({
  name: 'Karl',
});
// item = { id: 42, name: 'Karl', createdAt: ... }
```

#### Insert a single object without returning results from the db

```js
const success = await MyModel.create({
  name: 'Karl',
}, {
  returnRecords: false,
});
// success = true
```

#### Insert a single object but limit columns returned from db for inserted records (query projection)

```js
const item = await MyModel.create({
  name: 'Karl',
}, {
  returnSelect: ['name']
});
// item = { id: 42, name: 'Karl' }
```
> Note: The primary key will always be included. To only return the primary key value, pass an empty array

#### Insert a multiple object

```js
const items = await MyModel.create([{
  name: 'LX',
}, {
  name: 'Big Al',
}]);
// items = [{ id: 24, name: 'LX', createdAt: ... }, { id: 25, name: 'Big Al', createdAt: ... }]
```

#### Insert a multiple object without returning results from the db

```js
const success = await MyModel.create([{
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
const items = await MyModel.create([{
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
const items = await MyModel.update({
  id: 42,
}, {
  name: 'Big Al',
});
// items = [{ id: 42, name: 'Big Al', createdAt: ... }]
```
> Note: This method will return an array, regardless of how many records were affected


#### Update record without returning results from the db

```js
const success = await MyModel.update({
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
const items = await MyModel.update({
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
const items = await MyModel.destroy({
  id: 42,
});
// items = [{ id: 42, name: 'Big Al', createdAt: ... }]
```
> Note: This method will return an array, regardless of how many records were affected


#### Delete record without returning row data from the db

```js
const success = await MyModel.destroy({
  id: 42,
}, {
  returnRecords: false,
});
// success = true
```

#### Delete records and limit columns returned from db for affected records (query projection)

```js
const items = await MyModel.destroy({
  id: [24, 25],
}, {
  returnSelect: ['name']
});
// items = [{ id: 24, name: 'LX' }, { id: 25, name: 'Big Al' }]
```
> Note: The primary key will always be included. To only return the primary key value, pass an empty array



## License
MIT
