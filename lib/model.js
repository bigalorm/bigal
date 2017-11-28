'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const sqlHelper = require('./sqlHelper');

module.exports = class Model {
  /**
   * Creates a new Model object
   * @param {Object} modelSchema - Model definition
   * @param {Object} modelSchemasByGlobalId - All model schemas organized by global id
   * @param {Object} modelClassesByGlobalId - All model classes organized by global id
   * @param {Object} pool - Postgres Pool
   * @param {Object} [readonlyPool] - Postgres Pool for `find` and `findOne` operations. If not defined, `pool` will be used
   */
  constructor({
    modelSchema,
    modelSchemasByGlobalId,
    modelClassesByGlobalId,
    pool,
    readonlyPool,
  }) {
    this._modelSchemasByGlobalId = modelSchemasByGlobalId;
    this._modelClassesByGlobalId = modelClassesByGlobalId;
    this._schema = modelSchema;
    this._pool = pool;
    this._readonlyPool = readonlyPool;
  }

  /**
   * Gets a single object
   * @param {string[]} [select] - Array of model property names to return from the query.
   * @param {Object} [where] - Object representing the where query
   * @param {string|Object|string[]|Object[]} [sort] - Property name(s) to sort by
   */
  findOne({
    select,
    where = {},
    sort,
  } = {}) {
    const populates = [];
    const sorts = [];
    if (_.isArray(sort)) {
      sorts.push(...sort);
    } else if (sort) {
      sorts.push(sort);
    }

    /**
     * Filters the query
     * @param {string} propertyName - Name of property to join
     * @param {Object} where - Object representing the where query
     * @param {string|Object} sort - Property name(s) to sort by
     * @param {string|Number} skip - Number of records to skip
     * @param {string|Number} limit - Number of results to return
     */
    function populate(propertyName, {
      where,
      sort,
      skip,
      limit,
    } = {}) {
      populates.push({
        propertyName,
        where,
        sort,
        skip,
        limit,
      });

      const populatePromise = Promise.resolve();
      populatePromise.populate = populate;
      populatePromise.where = whereConstraint;
      populatePromise.sort = sortStatement;

      return populatePromise;
    }

    /**
     * Filters the query
     * @param {Object} value - Object representing the where query
     */
    function whereConstraint(value) {
      where = value;
      const wherePromise = Promise.resolve();
      wherePromise.populate = populate;
      wherePromise.sort = sortStatement;

      return wherePromise;
    }

    /**
     * Sorts the query
     * @param {string|Object} value
     */
    function sortStatement(value) {
      sorts.push(value);
      const sortPromise = Promise.resolve();
      sortPromise.populate = populate;

      return sortPromise;
    }

    const findPromise = new Promise.resolve().finally(async () => {
      const {
        query,
        params,
      } = sqlHelper.getSelectQueryAndParams({
        modelSchemasByGlobalId: this._modelSchemasByGlobalId,
        schema: this._schema,
        select,
        where,
        sorts,
        limit: 1,
      });

      const results = await this._query(this._readonlyPool, query, params);
      if (results.rows.length) {
        const result = results.rows[0];

        const populateQueries = [];
        for (const populate of populates) {
          const property = this._schema.attributes[populate.propertyName];
          if (!property) {
            throw new Error(`Unable to find ${populate.propertyName} on ${this._schema.globalId} model for populating.`);
          }

          if (property.model) {
            const populateModel = this._modelClassesByGlobalId[property.model.toLowerCase()];
            if (!populateModel) {
              throw new Error(`Unable to find model by global id: ${property.model}`);
            }

            const primaryKeyName = sqlHelper.getPrimaryKeyPropertyName({
              schema: populateModel._schema,
            });

            const populateWhere = _.merge({
              [primaryKeyName]: result[populate.propertyName],
            }, populate.where);

            populateQueries.push(async function populateSingle() {
              result[populate.propertyName] = await populateModel.findOne({
                select: populate.select,
                where: populateWhere,
                sort: populate.sort,
              });
            });
          } else {
            const populateModel = this._modelClassesByGlobalId[property.collection.toLowerCase()];
            if (!populateModel) {
              throw new Error(`Unable to find model for collection by global id ${property.collection}. For ${populate.propertyName} property of the ${this._schema.globalId} model.`);
            }

            const populateModelPrimaryKeyName = sqlHelper.getPrimaryKeyPropertyName({
              schema: populateModel._schema,
            });

            if (property.through) {
              const throughModel = this._modelClassesByGlobalId[property.through.toLowerCase()];
              if (!throughModel) {
                throw new Error(`Unable to find model for multi-map collection by global id ${property.through}. For ${populate.propertyName} property of the ${this._schema.globalId} model.`);
              }

              populateQueries.push(async function populateMultiMapCollection() {
                const ids = _.map(await throughModel.find({
                  select: [property.via],
                  where: {
                    [property.via]: result[populate.propertyName],
                  },
                }), property.via);

                const populateWhere = _.merge({
                  [populateModelPrimaryKeyName]: ids,
                }, populate.where);

                result[populate.propertyName] = await populateModel.find({
                  select: populate.select,
                  where: populateWhere,
                  sort: populate.sort,
                  skip: populate.skip,
                  limit: populate.limit,
                });
              });
            } else {
              const primaryKeyName = sqlHelper.getPrimaryKeyPropertyName({
                schema: this._schema,
              });

              const id = result[primaryKeyName];
              if (_.isUndefined(id)) {
                throw new Error(`Primary key (${primaryKeyName}) has no value for model ${this._schema.globalId}.`);
              }

              const populateWhere = _.merge({
                [populateModelPrimaryKeyName]: id,
              }, populate.where);

              populateQueries.push(async function populateCollection() {
                result[populate.propertyName] = await populateModel.find({
                  select: populate.select,
                  where: populateWhere,
                  sort: populate.sort,
                  skip: populate.skip,
                  limit: populate.limit,
                });
              });
            }
          }
        }

        if (populateQueries.length) {
          await Promise.all(populateQueries);
        }

        return result;
      }

      return null;
    });

    findPromise.where = whereConstraint;
    findPromise.sort = sortStatement;
    findPromise.populate = populate;

    return findPromise;
  }

  /**
   * Gets a collection of objects
   * @param {string[]} [select] - Array of model property names to return from the query.
   * @param {Object} [where] - Object representing the where query
   * @param {string|Object|string[]|Object[]} [sort] - Property name(s) to sort by
   * @param {string|Number} [skip] - Number of records to skip
   * @param {string|Number} [limit] - Number of results to return
   */
  find({
    select,
    where = {},
    sort,
    skip,
    limit,
  } = {}) {
    const sorts = [];
    if (_.isArray(sort)) {
      sorts.push(...sort);
    } else if (sort) {
      sorts.push(sort);
    }

    /**
     * Filters the query
     * @param {Object} value - Object representing the where query
     */
    function whereConstraint(value) {
      where = value;
      const wherePromise = Promise.resolve();
      wherePromise.sort = sortStatement;

      return wherePromise;
    }

    /**
     * Sorts the query
     * @param {string|Object} value
     */
    function sortStatement(value) {
      sorts.push(value);
      const sortPromise = Promise.resolve();
      sortPromise.skip = skipStatement;
      sortPromise.limit = limitStatement;

      return sortPromise;
    }

    /**
     * Limits results returned by the query
     * @param {string|Number} value
     */
    function limitStatement(value) {
      limit = value;
      const limitPromise = Promise.resolve();
      limitPromise.skip = skipStatement;
      limitPromise.sort = sortStatement;

      return limitPromise;
    }

    /**
     * Skips records returned by the query
     * @param {string|Number} value
     */
    function skipStatement(value) {
      skip = value;
      const skipPromise = Promise.resolve();
      skipPromise.limit = limitStatement;
      skipPromise.sort = sortStatement;

      return skipPromise;
    }

    const findPromise = new Promise.resolve().finally(async () => {
      const {
        query,
        params,
      } = sqlHelper.getSelectQueryAndParams({
        modelSchemasByGlobalId: this._modelSchemasByGlobalId,
        schema: this._schema,
        select,
        where,
        sorts,
        skip,
        limit,
      });

      const results = await this._query(this._readonlyPool, query, params);
      return results.rows;
    });

    findPromise.where = whereConstraint;
    findPromise.sort = sortStatement;
    findPromise.skip = skipStatement;
    findPromise.limit = limitStatement;

    return findPromise;
  }

  /**
   * Creates an object using the specified values
   * @param {Object|Object[]} values - Values to insert as a new object. If an array is specified, multiple rows will be inserted
   * @returns {Object} Return value from the db
   */
  async create(values) {
    const {
      query,
      params,
    } = sqlHelper.getInsertQueryAndParams({
      modelSchemasByGlobalId: this._modelSchemasByGlobalId,
      schema: this._schema,
      values,
    });

    const results = await this._query(this._pool, query, params);
    if (_.isArray(values)) {
      return results.rows;
    }

    if (results.rows.length) {
      return results.rows[0];
    }

    return null;
  }

  /**
   * Updates object(s) matching the where query, with the specified values
   * @param {Object} where - Object representing the where query
   * @param {Object} values - Values to update
   * @returns {Object[]} Return values from the db
   */
  async update(where, values) {
    const {
      query,
      params,
    } = sqlHelper.getUpdateQueryAndParams({
      modelSchemasByGlobalId: this._modelSchemasByGlobalId,
      schema: this._schema,
      where,
      values,
    });

    const results = await this._query(this._pool, query, params);
    return results.rows;
  }

  /**
   * Destroys object(s) matching the where query
   * @param {Object} where - Object representing the where query
   * @returns {void}
   */
  async destroy(where) {
    const {
      query,
      params,
    } = sqlHelper.getDestroyQueryAndParams({
      modelSchemasByGlobalId: this._modelSchemasByGlobalId,
      schema: this._schema,
      where,
    });

    await this._query(this._pool, query, params);
  }

  /**
   * Performs the db query using the specified pool, query, and parameters
   * @param {Object} pool
   * @param {string} query
   * @param {Object[]} params
   * @private
   */
  static _query(pool, query, params) {
    return pool.query(query, params);
  }
};
