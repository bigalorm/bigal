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
module.exports.hooks = {
  orm: false
};
```

#### `api/hooks/bigal/index.js`

```js
const _ = require('lodash');
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

        await bigal.initialize({
          modelSchemas,
          pool,
          readonlyPool,
          expose: (model, modelSchema) => {
            if (sails.globals.models) {
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

## License
MIT
