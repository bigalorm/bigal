# BigAl

[![NPM version](https://img.shields.io/npm/v/bigal.svg?style=flat)](https://npmjs.org/package/bigal)
[![Known Vulnerabilities](https://snyk.io/test/npm/bigal/badge.svg)](https://snyk.io/test/npm/bigal)

A fast, lightweight alternative to [Waterline](http://waterlinejs.org/). Supports [PostgreSQL](http://www.postgresql.org/) v9.6 and above. Note: this package does not create or update db schemas for you.

## Compatibility
- Node.js 8.x or above
- PostgreSQL 9.6.x

## Install

```sh
$ npm install bigal
```

## Configuring sails.js

#### Disable default ORM hook

```js
// config/hooks.js
module.exports = {
  orm: false,
  pubsub: false,
};
```

#### `api/hooks/bigal/index.js`

```js
const _ = require('lodash');
const fs = require('mz/fs');
const path = require('path');
const { Pool } = require('pg');
const bigal = require('bigal');

module.exports = (sails) => {
  return {
    loadModules(next) {
      (async function loadOrm() {
        sails.log.verbose('Setup BigAl orm...');

        const pool = new Pool(sails.config.connections.postgres);
        const readonlyPool = new Pool(sails.config.connections.readonlyPostgres);

        const modelsPath = path.join(__dirname, '../../models');
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const files = await fs.readdir(modelsPath);
        const modelSchemas = files.filter((file) => /.js$/ig.test(file)).map((file) => {
          const fileBasename = path.basename(file, '.js');
          /* eslint-disable global-require, import/no-dynamic-require */
          const schema = require(`${modelsPath}/${fileBasename}`);
          /* eslint-enable global-require, import/no-dynamic-require */

          return _.merge({
            globalId: fileBasename,
            tableName: fileBasename.toLowerCase(),
          }, schema);
        });

        sails.models = sails.models || {};
        await bigal.initialize({
          modelSchemas,
          pool,
          readonlyPool,
          expose: (model, modelSchema) => {
            if (sails.config.globals.models) {
              global[modelSchema.globalId] = model;
            }

            sails.models[modelSchema.globalId] = model;
          },
        });

        sails.log.verbose('Done!');

        return next();
      }()).catch(next);
    },
  };
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
const items = await MyModel.find().where({
  foo: context.params.foo,
}).paginate(2, 42);
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
