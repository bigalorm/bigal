'use strict';

const _ = require('lodash');
const Model = require('./lib/model');

module.exports = {
  /**
   * Initializes BigAl
   * @param {Object[]} modelSchemas - Model definitions
   * @param {Object} pool - Postgres Pool
   * @param {Object} [readonlyPool] - Postgres Pool for `find` and `findOne` operations. If not defined, `pool` will be used
   * @param {function} expose - Used to expose model classes
   */
  initialize({
    modelSchemas,
    pool,
    readonlyPool = pool,
    expose,
             }) {
    const modelClassesByGlobalId = {};
    const modelSchemasByGlobalId = _.keyBy(modelSchemas, 'globalId');

    for (const modelSchema of modelSchemas) {
      const model = new Model({
        modelSchema,
        modelSchemasByGlobalId,
        modelClassesByGlobalId,
        pool,
        readonlyPool,
      });

      modelClassesByGlobalId[modelSchema.globalId.toLowerCase()] = model;

      expose(model, modelSchema);
    }
  },
};
