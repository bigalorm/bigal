'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const sqlHelper = require('./sqlHelper');

module.exports = class Model {
  /**
   * Creates a new Model object
   * @param {Object} modelSchema - Model definition
   * @param {Object} modelsByGlobalId - All models organized by global id
   * @param {Object} pool - Postgres Pool
   * @param {Object} [readonlyPool] - Postgres Pool for `find` and `findOne` operations. If not defined, `pool` will be used
   */
  constructor({
    modelSchema,
    modelsByGlobalId,
    pool,
    readonlyPool,
  }) {
    this._modelsByGlobalId = modelsByGlobalId;
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
     */
    function populate(propertyName, {
      where,
      sort,
    } = {}) {
      populates.push({
        propertyName,
        where,
        sort,
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
        schema: this._schema,
        select,
        where,
        sorts,
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
            const populateModel = this._modelsByGlobalId[property.model.toLowerCase()];
            if (!populateModel) {
              throw new Error(`Unable to find model by global id: ${property.model}`);
            }

            let primaryKeyName = 'id';
            for (const [name, value] of Object.entries(populateModel._schema.attributes)) {
              if (value.primaryKey) {
                primaryKeyName = value.columnName || name;
                break;
              }
            }

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
          } else if (property.through) {
            // TODO: Query multi using the `via` property on the `through` table
          } else {
            // TODO: Do a find query
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
   */
  find({
    select,
    where = {},
    sort,
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
      return Promise.resolve();
    }

    const findPromise = new Promise.resolve().finally(async () => {
      const {
        query,
        params,
      } = sqlHelper.getSelectQueryAndParams({
        schema: this._schema,
        select,
        where,
        sorts,
      });

      const results = await this._query(this._readonlyPool, query, params);
      return results.rows;
    });

    findPromise.where = whereConstraint;
    findPromise.sort = sortStatement;

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
