'use strict';

const _ = require('lodash');
const Model = require('./lib/model');

module.exports = {
  /**
   * Initializes BigAl
   * @param {Object[]} modelSchemas - Model definitions
   * @param {Object} pool - Postgres Pool
   * @param {Object} [readonlyPool] - Postgres Pool for `find` and `findOne` operations. If not defined, `pool` will be used
   * @param {Object} [connections] - Key: name of the connection; Value: { pool, readonlyPool }
   * @param {function} expose - Used to expose model classes
   */
  initialize({
    modelSchemas,
    pool,
    readonlyPool = pool,
    connections = {},
    expose,
             }) {
    const modelClassesByGlobalId = {};
    const modelSchemasByGlobalId = _.keyBy(modelSchemas, (schema) => {
      return schema.globalId.toLowerCase();
    });

    for (const modelSchema of modelSchemas) {
      let modelPool = pool;
      let modelReadonlyPool = readonlyPool;

      if (modelSchema.connection) {
        const modelConnection = connections[modelSchema.connection];
        if (modelConnection) {
          modelPool = modelConnection.pool || pool;
          modelReadonlyPool = modelConnection.readonlyPool || modelPool;
        }
      }

      const model = new Model({
        modelSchema,
        modelSchemasByGlobalId,
        modelClassesByGlobalId,
        pool: modelPool,
        readonlyPool: modelReadonlyPool,
      });

      modelClassesByGlobalId[modelSchema.globalId.toLowerCase()] = model;

      expose(model, modelSchema);
    }
  },
};
