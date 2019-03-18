import * as _ from 'lodash';
import { ModelSchema } from './schema/ModelSchema';
import { BaseAttribute } from './schema/attributes/BaseAttribute';
import { WhereQuery } from './query/WhereQuery';
import { CollectionAttribute, ModelAttribute, TypeAttribute } from './schema/attributes';
import { Comparer } from './query/Comparer';
import { ModelSchemasByGlobalId } from './schema/ModelSchemasByGlobalId';

interface Entity { [index: string]: any; }

interface QueryAndParams {
  query: string;
  params: any[];
}

export class SqlHelper {
  /**
   * Gets the select syntax for the specified model and filters
   * @param {Object} modelSchemasByGlobalId - All model schemas organized by global id
   * @param {Object} schema - Model schema
   * @param {string[]} [select] - Array of model property names to return from the query.
   * @param {Object} [where] - Object representing the where query
   * @param {string[]|Object[]} [sorts] - Property name(s) to sort by
   * @param {number} [skip] - Number of records to skip
   * @param {number} [limit] - Number of results to return
   * @returns {{query: string, params: Array}}
   */
  public static getSelectQueryAndParams({
    modelSchemasByGlobalId,
    schema,
    select,
    where,
    sorts,
    skip,
    limit,
  }: {
    modelSchemasByGlobalId: ModelSchemasByGlobalId;
    schema: ModelSchema;
    select?: string[];
    where?: WhereQuery;
    sorts: Array<string | object>;
    skip: number;
    limit: number;
  }): QueryAndParams {
    let query = 'SELECT ';

    query += this._getColumnsToSelect({
      schema,
      select,
    });

    query += ` FROM "${schema.tableName}"`;

    const {
      whereStatement,
      params,
    } = this._buildWhereStatement({
      modelSchemasByGlobalId,
      schema,
      where,
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
        // tslint:disable-next-line:no-parameter-reassignment
        limit = Number(limit);
      }

      if (!_.isFinite(limit)) {
        throw new Error('Limit should be a number');
      }

      query += ` LIMIT ${limit}`;
    }

    if (skip) {
      if (_.isString(skip)) {
        // tslint:disable-next-line:no-parameter-reassignment
        skip = Number(skip);
      }

      if (!_.isFinite(skip)) {
        throw new Error('Skip should be a number');
      }

      query += ` OFFSET ${skip}`;
    }

    return {
      query,
      params,
    };
  }

  /**
   * Gets the count syntax for the specified model and values
   * @param {Object} modelSchemasByGlobalId - All model schemas organized by global id
   * @param {Object} schema - Model schema
   * @param {Object} [where] - Object representing the where query
   * @returns {{query: string, params: Array}}
   */
  public static getCountQueryAndParams({
    modelSchemasByGlobalId,
    schema,
    where,
  }: {
    modelSchemasByGlobalId: ModelSchemasByGlobalId;
    schema: ModelSchema;
    where?: WhereQuery;
  }): QueryAndParams {
    let query = `SELECT count(*) AS "count" FROM "${schema.tableName}"`;

    const {
      whereStatement,
      params,
    } = this._buildWhereStatement({
      modelSchemasByGlobalId,
      schema,
      where,
    });

    if (whereStatement) {
      query += ` ${whereStatement}`;
    }

    return {
      query,
      params,
    };
  }

  /**
   * Gets the insert syntax for the specified model and values
   * @param {Object} modelSchemasByGlobalId - All model schemas organized by global id
   * @param {Object} schema - Model schema
   * @param {Object|Object[]} values - Values to insert. Insert multiple records by passing an array of values.
   * @param {Boolean} [returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [returnSelect] - Array of model property names to return from the query.
   * @returns {{query: string, params: Array}}
   */
  public static getInsertQueryAndParams({
    modelSchemasByGlobalId,
    schema,
    values,
    returnRecords = true,
    returnSelect,
  }: {
    modelSchemasByGlobalId: ModelSchemasByGlobalId;
    schema: ModelSchema;
    values: Partial<Entity> | Array<Partial<Entity>>;
    returnRecords?: boolean;
    returnSelect?: Array<Extract<keyof Entity, string>>;
  }): QueryAndParams {
    const entitiesToInsert = _.isArray(values) ? values : [values];
    const propertiesToInsert = [];
    // Set defaulted property values and verify required columns have a value specified
    for (const [name, value] of Object.entries(schema.attributes)) {
      if (!(value as CollectionAttribute).collection && !_.isFunction(value)) {
        const defaultsTo = (value as TypeAttribute).defaultsTo;
        let defaultValue;
        if (_.isFunction(defaultsTo)) {
          defaultValue = defaultsTo();
        } else if (!_.isUndefined(defaultsTo)) {
          defaultValue = defaultsTo;
        } else if (name === 'createdAt' && schema.autoCreatedAt) {
          defaultValue = new Date();
        } else if (name === 'updatedAt' && schema.autoUpdatedAt) {
          defaultValue = new Date();
        }

        const hasDefaultValue = !_.isUndefined(defaultValue);
        let includePropertyName = false;
        for (const entity of entitiesToInsert) {
          // If there is a default value for the property and it is not defined, use the default
          if (hasDefaultValue && _.isUndefined(entity[name])) {
            entity[name] = defaultValue;
          }

          if (_.isUndefined(entity[name])) {
            if (value.required) {
              throw new Error(`Create statement for "${schema.globalId}" is missing value for required field: ${name}`);
            }
          } else {
            includePropertyName = true;
          }
        }

        if (includePropertyName) {
          propertiesToInsert.push(name);
        }
      }
    }

    const valueCollections: string[][] = entitiesToInsert.map(() => []);
    const params = [];
    let query = `INSERT INTO "${schema.tableName}" (`;
    for (const [propertyNameIndex, propertyName] of propertiesToInsert.entries()) {
      const property = schema.attributes[propertyName];
      const columnName = this._getColumnName({
        schema,
        propertyName,
      });
      if (propertyNameIndex > 0) {
        query += ',';
      }

      query += `"${columnName}"`;

      for (const [entityIndex, entity] of entitiesToInsert.entries()) {
        let value;
        const entityValue = entity[propertyName];
        if (_.isNil(entityValue)) {
          value = 'NULL';
        } else {
          const isJsonArray = (property as TypeAttribute).type === 'json' && _.isArray(entityValue);
          if ((property as ModelAttribute).model && _.isObject(entityValue)) {
            const relationSchema = modelSchemasByGlobalId[(property as ModelAttribute).model.toLowerCase()];

            if (!relationSchema) {
              throw new Error(`Unable to find model schema (${(property as ModelAttribute).model}) specified as model type for "${propertyName}" on "${schema.globalId}"`);
            }

            const relationPrimaryKeyPropertyName = this.getPrimaryKeyPropertyName({
              schema: relationSchema,
            });

            const primaryKeyValue = entityValue[relationPrimaryKeyPropertyName];
            if (_.isUndefined(primaryKeyValue)) {
              throw new Error(`Undefined primary key value for hydrated object value for "${propertyName}" on "${schema.globalId}"`);
            }

            params.push(primaryKeyValue);
          } else if (isJsonArray) {
            // Inserting an array to a json/jsonb column will result in a message: invalid input syntax for type json
            // https://github.com/brianc/node-postgres/issues/442
            params.push(JSON.stringify(entityValue));
          } else {
            params.push(entityValue);
          }

          value = `$${params.length}`;
          if (isJsonArray) {
            value += '::jsonb';
          }
        }

        valueCollections[entityIndex].push(value);
      }
    }

    query += ') VALUES ';
    for (const [index, valueCollection] of valueCollections.entries()) {
      if (index > 0) {
        query += ',';
      }

      query += `(${valueCollection.join(',')})`;
    }

    if (returnRecords) {
      query += ' RETURNING ';
      query += this._getColumnsToSelect({
        schema,
        select: returnSelect,
      });
    }

    return {
      query,
      params,
    };
  }

  /**
   * Gets the update syntax for the specified model and values
   * @param {Object} modelSchemasByGlobalId - All model schemas organized by global id
   * @param {Object} schema - Model schema
   * @param {Object} [where] - Object representing the where query
   * @param {Object} values - Values to set.
   * @param {Boolean} [returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [returnSelect] - Array of model property names to return from the query.
   * @returns {{query: string, params: Array}}
   */
  public static getUpdateQueryAndParams({
    modelSchemasByGlobalId,
    schema,
    where,
    values = {},
    returnRecords = true,
    returnSelect,
  }: {
    modelSchemasByGlobalId: ModelSchemasByGlobalId;
    schema: ModelSchema;
    where: WhereQuery;
    values: Partial<Entity>;
    returnRecords?: boolean;
    returnSelect?: Array<Extract<keyof Entity, string>>;
  }): QueryAndParams {
    if (schema.autoUpdatedAt && _.isUndefined(values.updatedAt)) {
      values.updatedAt = new Date();
    }

    const params = [];
    let query = `UPDATE "${schema.tableName}" SET `;
    let isFirstProperty = true;
    for (const [propertyName, value] of Object.entries(values)) {
      if (!_.isUndefined(schema.attributes[propertyName])) {
        const property = schema.attributes[propertyName];
        if (!(property as CollectionAttribute).collection) {
          const columnName = this._getColumnName({
            schema,
            propertyName,
          });

          if (!isFirstProperty) {
            query += ',';
          }

          query += `"${columnName}"=`;
          if (_.isNil(value)) {
            query += 'NULL';
          } else {
            const isJsonArray = (property as TypeAttribute).type === 'json' && _.isArray(value);
            if ((property as ModelAttribute).model && _.isObject(value)) {
              const relationSchema = modelSchemasByGlobalId[(property as ModelAttribute).model.toLowerCase()];

              if (!relationSchema) {
                throw new Error(`Unable to find model schema (${(property as ModelAttribute).model}) specified as model type for "${propertyName}" on "${schema.globalId}"`);
              }

              const relationPrimaryKeyPropertyName = this.getPrimaryKeyPropertyName({
                schema: relationSchema,
              });

              const primaryKeyValue = value[relationPrimaryKeyPropertyName];
              if (_.isUndefined(primaryKeyValue)) {
                throw new Error(`Undefined primary key value for hydrated object value for "${propertyName}" on "${schema.globalId}"`);
              }

              params.push(primaryKeyValue);
            } else if (isJsonArray) {
              // Inserting an array to a json/jsonb column will result in a message: invalid input syntax for type json
              // https://github.com/brianc/node-postgres/issues/442
              params.push(JSON.stringify(value));
            } else {
              params.push(value);
            }

            query += `$${params.length}`;
            if (isJsonArray) {
              query += '::jsonb';
            }
          }

          isFirstProperty = false;
        }
      }
    }

    const {
      whereStatement,
    } = this._buildWhereStatement({
      modelSchemasByGlobalId,
      schema,
      where,
      params,
    });

    if (whereStatement) {
      query += ` ${whereStatement}`;
    }

    if (returnRecords) {
      query += ' RETURNING ';
      query += this._getColumnsToSelect({
        schema,
        select: returnSelect,
      });
    }

    return {
      query,
      params,
    };
  }

  /**
   * Gets the delete syntax for the specified model and where criteria
   * @param {Object} modelSchemasByGlobalId - All model schemas organized by global id
   * @param {Object} schema - Model schema
   * @param {Object} [where] - Object representing the where query
   * @param {Boolean} [returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [returnSelect] - Array of model property names to return from the query.
   * @returns {{query: string, params: Array}}
   */
  public static getDeleteQueryAndParams({
    modelSchemasByGlobalId,
    schema,
    where,
    returnRecords = true,
    returnSelect,
  }: {
    modelSchemasByGlobalId: ModelSchemasByGlobalId;
    schema: ModelSchema;
    where?: WhereQuery;
    returnRecords?: boolean;
    returnSelect?: Array<Extract<keyof Entity, string>>;
  }): QueryAndParams {
    let query = `DELETE FROM "${schema.tableName}"`;

    const {
      whereStatement,
      params,
    } = this._buildWhereStatement({
      modelSchemasByGlobalId,
      schema,
      where,
    });

    if (whereStatement) {
      query += ` ${whereStatement}`;
    }

    if (returnRecords) {
      query += ' RETURNING ';
      query += this._getColumnsToSelect({
        schema,
        select: returnSelect,
      });
    }

    return {
      query,
      params,
    };
  }

  /**
   * Gets the property name of the primary key
   * @param {Object} schema - Model schema
   * @returns {string}
   */
  public static getPrimaryKeyPropertyName({
    schema,
  }: {
    schema: ModelSchema;
  }): string {
    for (const [name, value] of Object.entries(schema.attributes)) {
      if ((value as TypeAttribute).primaryKey) {
        return name;
      }
    }

    return 'id';
  }

  /**
   * Gets SQL representing columns to select
   * @param {Object} schema - Model schema
   * @param {string[]} [select] - Array of model property names to return from the query.
   * @returns {string} SQL columns
   * @private
   */
  // tslint:disable-next-line:function-name
  public static _getColumnsToSelect({
    schema,
    select,
  }: {
    schema: ModelSchema;
    select?: Array<Extract<keyof Entity, string>>;
  }): string {
    if (select) {
      const primaryKeyPropertyName = this.getPrimaryKeyPropertyName({
        schema,
      });

      // Include primary key column if it's not defined
      if (!select.includes(primaryKeyPropertyName)) {
        select.push(primaryKeyPropertyName);
      }
    } else {
      // tslint:disable-next-line:no-parameter-reassignment
      select = [];
      for (const [name, value] of Object.entries(schema.attributes)) {
        if (!(value as CollectionAttribute).collection && !_.isFunction(value)) {
          select.push(name);
        }
      }
    }

    let query = '';
    for (const [index, propertyName] of select.entries()) {
      const property = schema.attributes[propertyName];
      if (index > 0) {
        query += ',';
      }

      if (property && (property as BaseAttribute).columnName && (property as BaseAttribute).columnName !== propertyName) {
        query += `"${(property as BaseAttribute).columnName}" AS "${propertyName}"`;
      } else {
        query += `"${propertyName}"`;
      }
    }

    return query;
  }

  /**
   * Builds the SQL where statement based on the where expression
   * @param {Object} modelSchemasByGlobalId - All model schemas organized by global id
   * @param {Object} schema - Model schema
   * @param {Object} [where]
   * @param {Array} [params] - Objects to pass as parameters for the query
   * @returns {{whereStatement?: string, params: Array}}
   * @private
   */
  // tslint:disable-next-line:function-name
  public static _buildWhereStatement({
    modelSchemasByGlobalId,
    schema,
    where,
    params = [],
  }: {
    modelSchemasByGlobalId: ModelSchemasByGlobalId;
    schema: ModelSchema;
    where?: WhereQuery;
    params?: any[];
  }): {
    whereStatement?: string;
    params: any[];
  } {
    let whereStatement;
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
  }

  /**
   * Gets the name of the sql column for the specified property
   * @param {Object} schema - Model schema
   * @param {string} propertyName - Name of property in model
   * @returns {string} Column name
   * @private
   */
  // tslint:disable-next-line:function-name
  public static _getColumnName({
    schema,
    propertyName,
  }: {
    schema: ModelSchema;
    propertyName: string;
  }) {
    if (!propertyName) {
      throw new Error('propertyName is not defined.');
    }

    const property = schema.attributes[propertyName];
    if (!property) {
      throw new Error(`Property (${propertyName}) not found in model (${schema.globalId}).`);
    }

    return (property as BaseAttribute).columnName || propertyName;
  }

  /**
   * Builds the SQL order by statement based on the array of sortable expressions
   * @param {Object} schema - Model schema
   * @param {string[]|Object[]} sorts - Property name(s) to sort by
   * @returns {string} SQL order by statement
   * @private
   */
  // tslint:disable-next-line:function-name
  public static _buildOrderStatement({
    schema,
    sorts,
  }: {
    schema: ModelSchema;
    sorts: Array<string | object>
  }): string {
    if (_.isNil(sorts) || !_.some(sorts)) {
      return '';
    }

    let orderStatement = 'ORDER BY ';
    const orderProperties: Array<{
      propertyName: string;
      order: number | string;
    }> = [];
    for (const sortStatement of sorts) {
      if (_.isString(sortStatement)) {
        for (const sort of sortStatement.split(',')) {
          const parts = sort.split(' ');
          const propertyName = parts.shift();
          if (propertyName) {
            orderProperties.push({
              propertyName,
              order: parts.join(''),
            });
          }
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

      if (order && (order === -1 || order === '-1' || /desc/i.test(`${order}`))) {
        orderStatement += ' DESC';
      }
    }

    return orderStatement;
  }

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
  private static _buildWhere({
    modelSchemasByGlobalId,
    schema,
    propertyName,
    comparer,
    isNegated = false,
    value,
    params = [],
  }: {
    modelSchemasByGlobalId: ModelSchemasByGlobalId;
    schema: ModelSchema;
    propertyName?: string;
    comparer?: Comparer | string;
    isNegated?: boolean;
    value?: string | string[] | number | number[] | Date | WhereQuery | null | Entity;
    params: any[];
  }): string {
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
      case 'or': {
        const orClauses = [];
        for (const constraint of (value as string[] | number[])) {
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
        if (_.isArray(value)) {
          const values =  (value as string[]).map((val) => {
            if (!_.isString(val)) {
              throw new Error(`Expected all array values to be strings for "contains" constraint. Property (${propertyName}) in model (${schema.globalId}).`);
            }

            return `%${val}%`;
          });

          return this._buildWhere({
            modelSchemasByGlobalId,
            schema,
            propertyName,
            comparer: 'like',
            isNegated,
            value: values,
            params,
          });
        }

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
        if (_.isArray(value)) {
          const values = (value as string[]).map((val) => {
            if (!_.isString(val)) {
              throw new Error(`Expected all array values to be strings for "startsWith" constraint. Property (${propertyName}) in model (${schema.globalId}).`);
            }

            return `${val}%`;
          });

          return this._buildWhere({
            modelSchemasByGlobalId,
            schema,
            propertyName,
            comparer: 'like',
            isNegated,
            value: values,
            params,
          });
        }

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
        if (_.isArray(value)) {
          const values =  (value as string[]).map((val) => {
            if (!_.isString(val)) {
              throw new Error(`Expected all array values to be strings for "endsWith" constraint. Property (${propertyName}) in model (${schema.globalId}).`);
            }

            return `%${val}`;
          });

          return this._buildWhere({
            modelSchemasByGlobalId,
            schema,
            propertyName,
            comparer: 'like',
            isNegated,
            value: values,
            params,
          });
        }

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
        if (_.isArray(value)) {
          if (!value.length) {
            if (isNegated) {
              return '1=1';
            }
            return '1<>1';
          }

          if (value.length > 1) {
            const lowerValues =  (value as string[]).map((val) => {
              return val.toLowerCase();
            });

            const columnName = this._getColumnName({
              schema,
              propertyName: propertyName!,
            });

            // NOTE: This is doing a case-insensitive pattern match
            params.push(lowerValues);
            return `lower("${columnName}")${isNegated ? '<>ALL' : '=ANY'}($${params.length}::TEXT[])`;
          }

          // tslint:disable-next-line:no-parameter-reassignment
          value = _.first(value as string[]);
        }

        if (_.isString(value)) {
          const columnName = this._getColumnName({
            schema,
            propertyName: propertyName!,
          });

          // NOTE: This is doing a case-insensitive pattern match
          params.push(value);
          return `"${columnName}"${isNegated ? ' NOT' : ''} ILIKE $${params.length}`;
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
              if ((property as ModelAttribute).model && _.isObject(value)) {
                const relationSchema = modelSchemasByGlobalId[(property as ModelAttribute).model.toLowerCase()];

                if (!relationSchema) {
                  throw new Error(`Unable to find model schema (${(property as ModelAttribute).model}) specified in where clause`);
                }

                const relationPrimaryKey = this.getPrimaryKeyPropertyName({
                  schema: relationSchema,
                });

                if (!_.isUndefined((value as Entity)[relationPrimaryKey])) {
                  // Treat `value` as a hydrated object
                  return this._buildWhere({
                    modelSchemasByGlobalId,
                    schema,
                    propertyName,
                    comparer,
                    isNegated,
                    value: (value as Entity)[relationPrimaryKey],
                    params,
                  });
                }
              }
            }
          }

          if (_.isArray(value)) {
            if (!value.length) {
              const propertyFromPropertyName = propertyName ? schema.attributes[propertyName] : null;
              const propertyFromComparer = comparer ? schema.attributes[comparer] : null;
              const property = propertyFromPropertyName || propertyFromComparer;

              if (property && (property as TypeAttribute).type && (property as TypeAttribute).type.toLowerCase() === 'array') {
                const columnName = this._getColumnName({
                  schema,
                  propertyName: propertyName!,
                });

                return `"${columnName}"${isNegated ? '<>' : '='}'{}'`;
              }

              if (isNegated) {
                return '1=1';
              }

              return '1<>1';
            }

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
                propertyName: propertyName!,
              });

              const propertyFromPropertyName = propertyName ? schema.attributes[propertyName] : null;
              const propertyFromComparer = comparer ? schema.attributes[comparer] : null;
              const property = propertyFromPropertyName || propertyFromComparer;
              const propertyType = property && (property as TypeAttribute).type ? (property as TypeAttribute).type.toLowerCase() : '';
              // If an array column type is queried with an array value, query each value of the array value separately
              if (propertyType === 'array') {
                for (const val of valueWithoutNull) {
                  orConstraints.push(this._buildWhere({
                    modelSchemasByGlobalId,
                    schema,
                    propertyName,
                    isNegated,
                    value: val,
                    params,
                  }));
                }
              } else {
                let castType;
                switch (propertyType) {
                  case 'int':
                  case 'integer':
                    castType = '::INTEGER[]';
                    break;
                  case 'float':
                    castType = '::NUMERIC[]';
                    break;
                  default:
                    castType = '::TEXT[]';
                    break;
                }

                params.push(valueWithoutNull);
                orConstraints.push(`"${columnName}"${isNegated ? '<>ALL' : '=ANY'}($${params.length}${castType})`);
              }
            }

            if (orConstraints.length === 1) {
              return orConstraints[0];
            }

            if (isNegated) {
              return orConstraints.join(' AND ');
            }

            return `(${orConstraints.join(' OR ')})`;
          }

          if (_.isObject(value) && !_.isDate(value)) {
            const andValues = [];
            for (const [key, where] of Object.entries(value as WhereQuery)) {
              let subQueryComparer: (Comparer | string | undefined);
              if (this._isComparer(key)) {
                subQueryComparer = key;
              } else {
                // tslint:disable-next-line:no-parameter-reassignment
                propertyName = key;
              }

              andValues.push(this._buildWhere({
                modelSchemasByGlobalId,
                schema,
                propertyName,
                comparer: subQueryComparer,
                isNegated,
                value: where,
                params,
              }));
            }

            return andValues.join(' AND ');
          }

          const columnName = this._getColumnName({
            schema,
            propertyName: propertyName!,
          });

          if (_.isNull(value)) {
            return `"${columnName}" ${isNegated ? 'IS NOT' : 'IS'} NULL`;
          }

          params.push(value);

          const property = schema.attributes[propertyName!];
          const propertyType = (property as TypeAttribute).type;
          const supportsLessThanGreaterThan = propertyType !== 'array' && propertyType !== 'json';

          switch (comparer) {
            case '<':
              if (!supportsLessThanGreaterThan) {
                throw new Error(`< operator is not supported for ${propertyType || 'unknown'} type. ${propertyName || ''} on ${schema.globalId}`);
              }

              return `"${columnName}"${isNegated ? '>=' : '<'}$${params.length}`;
            case '<=':
              if (!supportsLessThanGreaterThan) {
                throw new Error(`<= operator is not supported for ${propertyType || 'unknown'} type. ${propertyName || ''} on ${schema.globalId}`);
              }

              return `"${columnName}"${isNegated ? '>' : '<='}$${params.length}`;
            case '>':
              if (!supportsLessThanGreaterThan) {
                throw new Error(`> operator is not supported for ${propertyType || 'unknown'} type. ${propertyName || ''} on ${schema.globalId}`);
              }

              return `"${columnName}"${isNegated ? '<=' : '>'}$${params.length}`;
            case '>=':
              if (!supportsLessThanGreaterThan) {
                throw new Error(`>= operator is not supported for ${propertyType || 'unknown'} type. ${propertyName || ''} on ${schema.globalId}`);
              }

              return `"${columnName}"${isNegated ? '<' : '>='}$${params.length}`;
            default:
              if (propertyType === 'array') {
                return `$${params.length}${isNegated ? '<>ALL(' : '=ANY('}"${columnName}")`;
              }

              return `"${columnName}"${isNegated ? '<>' : '='}$${params.length}`;
          }
        }
    }
  }

  /**
   * Determines if the specified value is a comparer
   * @param value
   * @returns {boolean}
   * @private
   */
  private static _isComparer(value: string): boolean {
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
  }
}
