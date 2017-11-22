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
    const modelsByGlobalId = {};

    for (const modelSchema of modelSchemas) {
      const model = new Model({
        modelSchema,
        modelsByGlobalId,
        pool,
        readonlyPool,
      });

      modelsByGlobalId[modelSchema.globalId.toLowerCase()] = model;

      expose(model, modelSchema);
    }
  },
};
