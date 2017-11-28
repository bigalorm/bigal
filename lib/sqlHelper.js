'use strict';

const _ = require('lodash');

module.exports = {
  /**
   * Gets the select syntax for the specified model and filters
   * @param {Object} modelSchemasByGlobalId - All model schemas organized by global id
   * @param {Object} schema - Model schema
   * @param {string[]} [select] - Array of model property names to return from the query.
   * @param {Object} [where] - Object representing the where query
   * @param {string[]|Object[]} [sorts] - Property name(s) to sort by
   * @param {string|Number} [skip] - Number of records to skip
   * @param {string|Number} [limit] - Number of results to return
   */
  getSelectQueryAndParams({
    modelSchemasByGlobalId,
    schema,
    select,
    where,
    sorts,
    skip,
    limit,
  }) {
    let query = 'SELECT ';

    if (select) {
      const primaryKeyPropertyName = this.getPrimaryKeyPropertyName({
        schema,
      });

      // Include primary key column if it's not defined
      if (!select.includes(primaryKeyPropertyName)) {
        select.push(primaryKeyPropertyName);
      }
    } else {
      select = [];
      for (const [name, value] of Object.entries(schema.attributes)) {
        if (!value.collection) {
          select.push(name);
        }
      }
    }

    for (const [index, propertyName] of select.entries()) {
      const property = schema.attributes[propertyName];
      if (index > 0) {
        query += ',';
      }

      if (property && property.columnName) {
        query += `"${property.columnName}" AS "${propertyName}"`;
      } else {
        query += `"${propertyName}"`;
      }
    }

    query += ` FROM "${schema.tableName}"`;

    const {
      whereStatement,
      params,
    } = this._buildWhereStatement({
      modelSchemasByGlobalId,
      schema,
      where,
      includeWhereClause: true,
    });

    if (whereStatement) {
      query += ` ${whereStatement}`;
    }

    const orderStatement = this._buildOrderStatement({
      schema,
      sorts,
    });

    if (orderStatement) {
      query += ` ${orderStatement}`;
    }

    if (limit) {
      if (_.isString(limit)) {
        limit = Number.parseInt(limit);
      }

      if (!_.isNumber(limit) || _.isNaN(limit)) {
        throw new Error('Limit should be a number');
      }

      query += ` LIMIT ${limit}`;
    }

    if (skip) {
      if (_.isString(skip)) {
        skip = Number.parseInt(skip);
      }

      if (!_.isNumber(skip) || _.isNaN(skip)) {
        throw new Error('Skip should be a number');
      }

      query += ` OFFSET ${skip}`;
    }

    return {
      query,
      params,
    };
  },

  /**
   * Gets the property name of the primary key
   * @param {Object} schema - Model schema
   * @returns {string}
   */
  getPrimaryKeyPropertyName({
    schema,
  }) {
    for (const [name, value] of Object.entries(schema.attributes)) {
      if (value.primaryKey) {
        return name;
      }
    }

    return 'id';
  },

  /**
   * Builds the SQL where statement based on the where expression
   * @param {Object} modelSchemasByGlobalId - All model schemas organized by global id
   * @param {Object} schema - Model schema
   * @param {Object} [where]
   * @returns {{whereStatement: string, params: Array}}
   * @private
   */
  _buildWhereStatement({
    modelSchemasByGlobalId,
    schema,
    where,
  }) {
    let whereStatement;
    const params = [];
    if (_.isObject(where)) {
      whereStatement = this._buildWhere({
        modelSchemasByGlobalId,
        schema,
        comparer: 'and',
        value: where,
        params,
      });
    }

    if (whereStatement) {
      whereStatement = `WHERE ${whereStatement}`;
    }

    return {
      whereStatement,
      params,
    };
  },

  /**
   * Builds a portion of the where statement based on the propertyName
   * @param {Object} modelSchemasByGlobalId - All model schemas organized by global id
   * @param {Object} schema - Model schema
   * @param {string} [propertyName] - Name of property to query by
   * @param {string} [comparer] - Comparison operator
   * @param {Boolean} [isNegated=false] - If it is negated comparison
   * @param {Object|string|Number} [value] - Value to compare. Can also represent a complex where query
   * @param {Array} params - Objects to pass as parameters for the query
   * @returns {string} - Query text
   * @private
   */
  _buildWhere({
    modelSchemasByGlobalId,
    schema,
    propertyName,
    comparer,
    isNegated = false,
    value,
    params = [],
  }) {
    switch (comparer || propertyName) {
      case '!':
      case 'not':
        return this._buildWhere({
          modelSchemasByGlobalId,
          schema,
          propertyName,
          isNegated: true,
          value,
          params,
        });
      case 'or':
        {
          const orClauses = [];
          for (const constraint of value) {
            const orClause = this._buildWhere({
              modelSchemasByGlobalId,
              schema,
              isNegated,
              value: constraint,
              params,
            });

            orClauses.push(`(${orClause})`);
          }

          if (orClauses.length === 1) {
            return orClauses[0];
          }

          if (isNegated) {
            return orClauses.join(' AND ');
          }

          return `(${orClauses.join(' OR ')})`;
        }
      case 'contains':
        if (_.isString(value)) {
          return this._buildWhere({
            modelSchemasByGlobalId,
            schema,
            propertyName,
            comparer: 'like',
            isNegated,
            value: `%${value}%`,
            params,
          });
        }

        throw new Error(`Expected value to be a string for "contains" constraint. Property (${propertyName}) in model (${schema.globalId}).`);
      case 'startsWith':
        if (_.isString(value)) {
          return this._buildWhere({
            modelSchemasByGlobalId,
            schema,
            propertyName,
            comparer: 'like',
            isNegated,
            value: `${value}%`,
            params,
          });
        }

        throw new Error(`Expected value to be a string for "startsWith" constraint. Property (${propertyName}) in model (${schema.globalId}).`);
      case 'endsWith':
        if (_.isString(value)) {
          return this._buildWhere({
            modelSchemasByGlobalId,
            schema,
            propertyName,
            comparer: 'like',
            isNegated,
            value: `%${value}`,
            params,
          });
        }

        throw new Error(`Expected value to be a string for "endsWith" constraint. Property (${propertyName}) in model (${schema.globalId}).`);
      case 'like':
        if (_.isString(value)) {
          const columnName = this._getColumnName({
            schema,
            propertyName,
          });

          // NOTE: This is doing a case-insensitive pattern match
          params.push(value);
          return `"${columnName}"${isNegated ? ' not' : ''} ILIKE $${params.length}`;
        }

        throw new Error(`Expected value to be a string for "like" constraint. Property (${propertyName}) in model (${schema.globalId}).`);
      default:
        {
          if (_.isUndefined(value)) {
            throw new Error(`Attempting to query with an undefined value. ${propertyName || ''} on ${schema.globalId}`);
          }

          if (propertyName) {
            const propertyFromPropertyName = propertyName ? schema.attributes[propertyName] : null;
            const propertyFromComparer = comparer ? schema.attributes[comparer] : null;
            const property = propertyFromPropertyName || propertyFromComparer;
            if (property) {
              if (property.model && _.isObject(value)) {
                const relationSchema = modelSchemasByGlobalId[property.model.toLowerCase()];

                if (!relationSchema) {
                  throw new Error(`Unable to find model schema (${property.model}) specified in where clause`);
                }

                const relationPrimaryKey = this.getPrimaryKeyPropertyName({
                  schema: relationSchema,
                });

                if (!_.isUndefined(value[relationPrimaryKey])) {
                  // Treat `value` as a hydrated object
                  return this._buildWhere({
                    modelSchemasByGlobalId,
                    schema,
                    propertyName,
                    comparer,
                    isNegated,
                    value: value[relationPrimaryKey],
                    params,
                  });
                }
              }
            }
          }

          if (_.isArray(value)) {
            const orConstraints = [];
            const valueWithoutNull = [];
            for (const item of value) {
              if (_.isNull(item)) {
                orConstraints.push(this._buildWhere({
                  modelSchemasByGlobalId,
                  schema,
                  propertyName,
                  isNegated,
                  value: null,
                  params,
                }));
              } else {
                valueWithoutNull.push(item);
              }
            }

            if (valueWithoutNull.length === 1) {
              orConstraints.push(this._buildWhere({
                modelSchemasByGlobalId,
                schema,
                propertyName,
                isNegated,
                value: valueWithoutNull[0],
                params,
              }));
            } else if (valueWithoutNull.length) {
              const columnName = this._getColumnName({
                schema,
                propertyName,
              });

              params.push(valueWithoutNull);
              orConstraints.push(`"${columnName}"${isNegated ? '<>ALL' : '=ANY'}($${params.length})`);
            }

            if (orConstraints.length === 1) {
              return orConstraints[0];
            }

            if (isNegated) {
              return orConstraints.join(' AND ');
            }

            return `(${orConstraints.join(' OR ')})`;
          }

          if (_.isObject(value)) {
            const andValues = [];
            for (const [key, where] of Object.entries(value)) {
              if (this._isComparer(key)) {
                comparer = key;
              } else {
                propertyName = key;
              }

              andValues.push(this._buildWhere({
                modelSchemasByGlobalId,
                schema,
                propertyName,
                comparer,
                isNegated,
                value: where,
                params,
              }));
            }

            return andValues.join(' AND ');
          }

          const columnName = this._getColumnName({
            schema,
            propertyName,
          });

          if (_.isNull(value)) {
            return `"${columnName}" ${isNegated ? 'IS NOT' : 'IS'} NULL`;
          }

          params.push(value);
          switch (comparer) {
            case '<':
              return `"${columnName}"${isNegated ? '>=' : '<'}$${params.length}`;
            case '<=':
              return `"${columnName}"${isNegated ? '>' : '<='}$${params.length}`;
            case '>':
              return `"${columnName}"${isNegated ? '<=' : '>'}$${params.length}`;
            case '>=':
              return `"${columnName}"${isNegated ? '<' : '>='}$${params.length}`;
            default:
              return `"${columnName}"${isNegated ? '<>' : '='}$${params.length}`;
          }
        }
    }
  },

  /**
   * Determines if the specified value is a comparer
   * @param value
   * @returns {boolean}
   * @private
   */
  _isComparer(value) {
    switch (value) {
      case '!':
      case 'not':
      case 'or':
      case 'and':
      case 'contains':
      case 'startsWith':
      case 'endsWith':
      case 'like':
      case '<':
      case '<=':
      case '>':
      case '>=':
        return true;
      default:
        return false;
    }
  },

  /**
   * Gets the name of the sql column for the specified property
   * @param {Object} schema - Model schema
   * @param {string} propertyName - Name of property in model
   * @returns {string} Column name
   * @private
   */
  _getColumnName({
    schema,
    propertyName,
  }) {
    if (!propertyName) {
      throw new Error('propertyName is not defined.');
    }

    const property = schema.attributes[propertyName];
    if (!property) {
      throw new Error(`Property (${propertyName}) not found in model (${schema.globalId}).`);
    }

    return property.columnName || propertyName;
  },

  /**
   * Builds the SQL order by statement based on the array of sortable expressions
   * @param {Object} schema - Model schema
   * @param {string[]|Object[]} sorts - Property name(s) to sort by
   * @returns {string} SQL order by statement
   * @private
   */
  _buildOrderStatement({
    schema,
    sorts,
  }) {
    if (_.isNil(sorts) || !_.some(sorts)) {
      return '';
    }

    let orderStatement = 'ORDER BY ';
    const orderProperties = [];
    for (const sortStatement of sorts) {
      if (_.isString(sortStatement)) {
        for (const sort of sortStatement.split(',')) {
          const parts = sort.split(' ');
          const propertyName = parts.shift();
          orderProperties.push({
            propertyName,
            order: parts.join(''),
          });
        }
      } else if (_.isObject(sortStatement)) {
        for (const [propertyName, order] of Object.entries(sortStatement)) {
          orderProperties.push({
            propertyName,
            order,
          });
        }
      }
    }

    for (const [index, orderProperty] of orderProperties.entries()) {
      if (index > 0) {
        orderStatement += ',';
      }

      const {
        propertyName,
        order,
      } = orderProperty;
      const columnName = this._getColumnName({
        schema,
        propertyName,
      });

      orderStatement += `"${columnName}"`;

      if (order && (order === -1 || order === '-1' || /desc/i.test(order))) {
        orderStatement += ' DESC';
      }
    }

    return orderStatement;
  },
};
