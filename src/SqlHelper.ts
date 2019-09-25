import * as _ from 'lodash';
import { Entity } from './Entity';
import {
  Comparer,
  WhereClauseValue,
  WhereQuery,
} from './query';
import { RepositoriesByModelNameLowered } from './RepositoriesByModelNameLowered';
import {
  ColumnCollectionMetadata,
  ColumnModelMetadata,
  ColumnTypeMetadata,
  ModelMetadata,
} from './metadata';

interface QueryAndParams {
  query: string;
  params: any[];
}

export class SqlHelper {
  /**
   * Gets the select syntax for the specified model and filters
   * @param {Object} repositoriesByModelNameLowered - All model schemas organized by model name
   * @param {Object} model - Model schema
   * @param {string[]} [select] - Array of model property names to return from the query.
   * @param {Object} [where] - Object representing the where query
   * @param {string[]|Object[]} [sorts] - Property name(s) to sort by
   * @param {number} [skip] - Number of records to skip
   * @param {number} [limit] - Number of results to return
   * @returns {{query: string, params: Array}}
   */
  public static getSelectQueryAndParams({
    repositoriesByModelNameLowered,
    model,
    select,
    where,
    sorts,
    skip,
    limit,
  }: {
    repositoriesByModelNameLowered: RepositoriesByModelNameLowered;
    model: ModelMetadata;
    select?: string[];
    where?: WhereQuery;
    sorts: Array<string | object>;
    skip: number;
    limit: number;
  }): QueryAndParams {
    let query = 'SELECT ';

    query += this._getColumnsToSelect({
      model,
      select,
    });

    query += ` FROM "${model.tableName}"`;

    const {
      whereStatement,
      params,
    } = this._buildWhereStatement({
      repositoriesByModelNameLowered,
      model,
      where,
    });

    if (whereStatement) {
      query += ` ${whereStatement}`;
    }

    const orderStatement = this._buildOrderStatement({
      model,
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
   * @param {Object} repositoriesByModelNameLowered - All model schemas organized by model name
   * @param {Object} model - Model schema
   * @param {Object} [where] - Object representing the where query
   * @returns {{query: string, params: Array}}
   */
  public static getCountQueryAndParams({
    repositoriesByModelNameLowered,
    model,
    where,
  }: {
    repositoriesByModelNameLowered: RepositoriesByModelNameLowered;
    model: ModelMetadata;
    where?: WhereQuery;
  }): QueryAndParams {
    let query = `SELECT count(*) AS "count" FROM "${model.tableName}"`;

    const {
      whereStatement,
      params,
    } = this._buildWhereStatement({
      repositoriesByModelNameLowered,
      model,
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
   * @param {Object} repositoriesByModelNameLowered - All model schemas organized by model name
   * @param {Object} model - Model schema
   * @param {Object|Object[]} values - Values to insert. Insert multiple records by passing an array of values.
   * @param {Boolean} [returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [returnSelect] - Array of model property names to return from the query.
   * @returns {{query: string, params: Array}}
   */
  public static getInsertQueryAndParams({
    repositoriesByModelNameLowered,
    model,
    values,
    returnRecords = true,
    returnSelect,
  }: {
    repositoriesByModelNameLowered: RepositoriesByModelNameLowered;
    model: ModelMetadata;
    values: Partial<Entity> | Array<Partial<Entity>>;
    returnRecords?: boolean;
    returnSelect?: Array<Extract<keyof Entity, string>>;
  }): QueryAndParams {
    const entitiesToInsert = _.isArray(values) ? values : [values];
    const columnsToInsert = [];
    // Set defaulted property values and verify required columns have a value specified
    for (const column of model.columns) {
      const collectionColumn = column as ColumnCollectionMetadata;
      if (!collectionColumn.collection) {
        const defaultsTo = (column as ColumnTypeMetadata).defaultsTo;
        let defaultValue;
        if (_.isFunction(defaultsTo)) {
          defaultValue = defaultsTo();
        } else if (!_.isUndefined(defaultsTo)) {
          defaultValue = defaultsTo;
        } else if (column.createDate) {
          defaultValue = new Date();
        } else if (column.updateDate) {
          defaultValue = new Date();
        } else if (column.version) {
          defaultValue = 1;
        }

        const hasDefaultValue = !_.isUndefined(defaultValue);
        let includePropertyName = false;
        for (const entity of entitiesToInsert) {
          // If there is a default value for the property and it is not defined, use the default
          if (hasDefaultValue && _.isUndefined(entity[column.propertyName])) {
            entity[column.propertyName] = defaultValue;
          }

          if (_.isUndefined(entity[column.propertyName])) {
            if (column.required) {
              throw new Error(`Create statement for "${model.name}" is missing value for required field: ${column.propertyName}`);
            }
          } else {
            includePropertyName = true;
          }
        }

        if (includePropertyName) {
          columnsToInsert.push(column);
        }
      }
    }

    const valueCollections: string[][] = entitiesToInsert.map(() => []);
    const params = [];
    let query = `INSERT INTO "${model.tableName}" (`;
    for (const [columnIndex, column] of columnsToInsert.entries()) {
      if (columnIndex > 0) {
        query += ',';
      }

      query += `"${column.name}"`;

      for (const [entityIndex, entity] of entitiesToInsert.entries()) {
        let value;
        const entityValue = entity[column.propertyName];
        if (_.isNil(entityValue)) {
          value = 'NULL';
        } else {
          const isJsonArray = (column as ColumnTypeMetadata).type === 'json' && _.isArray(entityValue);
          const relatedModelName = (column as ColumnModelMetadata).model;
          if (relatedModelName && _.isObject(entityValue)) {
            const relatedModelRepository = repositoriesByModelNameLowered[relatedModelName.toLowerCase()];

            if (!relatedModelRepository) {
              throw new Error(`Unable to find model schema (${relatedModelName}) specified as model type for "${column.propertyName}" on "${model.name}"`);
            }

            const relatedModelPrimaryKey = relatedModelRepository.model.primaryKeyColumn;
            if (!relatedModelPrimaryKey) {
              throw new Error(`Unable to find primary key column for ${relatedModelName} when inserting ${model.name}.${column.propertyName} value.`);
            }

            const primaryKeyValue = (entityValue as Partial<Entity>)[relatedModelPrimaryKey.propertyName];
            if (_.isNil(primaryKeyValue)) {
              throw new Error(`Undefined primary key value for hydrated object value for "${column.propertyName}" on "${model.name}"`);
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
        model,
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
   * @param {Object} repositoriesByModelNameLowered - All model schemas organized by global id
   * @param {Object} model - Model schema
   * @param {Object} [where] - Object representing the where query
   * @param {Object} values - Values to set.
   * @param {Boolean} [returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [returnSelect] - Array of model property names to return from the query.
   * @returns {{query: string, params: Array}}
   */
  public static getUpdateQueryAndParams({
    repositoriesByModelNameLowered,
    model,
    where,
    values = {},
    returnRecords = true,
    returnSelect,
  }: {
    repositoriesByModelNameLowered: RepositoriesByModelNameLowered;
    model: ModelMetadata;
    where: WhereQuery;
    values: Partial<Entity>;
    returnRecords?: boolean;
    returnSelect?: Array<Extract<keyof Entity, string>>;
  }): QueryAndParams {
    for (const column of model.updateDateColumns) {
      if (_.isUndefined(values[column.propertyName])) {
        values[column.propertyName] = new Date();
      }
    }

    const params = [];
    let query = `UPDATE "${model.tableName}" SET `;
    let isFirstProperty = true;
    for (const [propertyName, value] of Object.entries(values)) {
      const column = model.columnsByPropertyName[propertyName];
      if (column && !(column as ColumnCollectionMetadata).collection) {
        if (!isFirstProperty) {
          query += ',';
        }

        query += `"${column.name}"=`;
        if (_.isNil(value)) {
          query += 'NULL';
        } else {
          const isJsonArray = (column as ColumnTypeMetadata).type === 'json' && _.isArray(value);
          const relatedModelName = (column as ColumnModelMetadata).model;
          if (relatedModelName && _.isObject(value)) {
            const relatedModelRepository = repositoriesByModelNameLowered[relatedModelName.toLowerCase()];

            if (!relatedModelRepository) {
              throw new Error(`Unable to find model schema (${relatedModelName}) specified as model type for "${propertyName}" on "${model.name}"`);
            }

            const relatedModelPrimaryKey = relatedModelRepository.model.primaryKeyColumn;
            if (!relatedModelPrimaryKey) {
              throw new Error(`Unable to find primary key column for ${relatedModelName} when inserting ${model.name}.${column.propertyName} value.`);
            }

            const primaryKeyValue = (value as Partial<Entity>)[relatedModelPrimaryKey.propertyName];
            if (_.isNil(primaryKeyValue)) {
              throw new Error(`Undefined primary key value for hydrated object value for "${column.propertyName}" on "${model.name}"`);
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

    for (const column of model.versionColumns) {
      if (!_.isUndefined(values[column.propertyName])) {
        if (!isFirstProperty) {
          query += ',';
        }

        query += `"${column.name}"="${column.name}"+1`;

        isFirstProperty = false;
      }
    }

    const {
      whereStatement,
    } = this._buildWhereStatement({
      repositoriesByModelNameLowered,
      model,
      where,
      params,
    });

    if (whereStatement) {
      query += ` ${whereStatement}`;
    }

    if (returnRecords) {
      query += ' RETURNING ';
      query += this._getColumnsToSelect({
        model,
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
   * @param {Object} repositoriesByModelNameLowered - All model schemas organized by global id
   * @param {Object} model - Model schema
   * @param {Object} [where] - Object representing the where query
   * @param {Boolean} [returnRecords=true] - Determines if inserted records should be returned
   * @param {string[]} [returnSelect] - Array of model property names to return from the query.
   * @returns {{query: string, params: Array}}
   */
  public static getDeleteQueryAndParams({
    repositoriesByModelNameLowered,
    model,
    where,
    returnRecords = true,
    returnSelect,
  }: {
    repositoriesByModelNameLowered: RepositoriesByModelNameLowered;
    model: ModelMetadata;
    where?: WhereQuery;
    returnRecords?: boolean;
    returnSelect?: Array<Extract<keyof Entity, string>>;
  }): QueryAndParams {
    let query = `DELETE FROM "${model.tableName}"`;

    const {
      whereStatement,
      params,
    } = this._buildWhereStatement({
      repositoriesByModelNameLowered,
      model,
      where,
    });

    if (whereStatement) {
      query += ` ${whereStatement}`;
    }

    if (returnRecords) {
      query += ' RETURNING ';
      query += this._getColumnsToSelect({
        model,
        select: returnSelect,
      });
    }

    return {
      query,
      params,
    };
  }

  /**
   * Gets SQL representing columns to select
   * @param {Object} model - Model schema
   * @param {string[]} [select] - Array of model property names to return from the query.
   * @returns {string} SQL columns
   * @private
   */
  // tslint:disable-next-line:function-name
  public static _getColumnsToSelect({
    model,
    select,
  }: {
    model: ModelMetadata;
    select?: Array<Extract<keyof Entity, string>>;
  }): string {
    if (select) {
      const primaryKeyColumn = model.primaryKeyColumn;

      // Include primary key column if it's not defined
      if (primaryKeyColumn && !select.includes(primaryKeyColumn.propertyName)) {
        select.push(primaryKeyColumn.propertyName);
      }
    } else {
      // tslint:disable-next-line:no-parameter-reassignment
      select = [];
      for (const column of model.columns) {
        if (!(column as ColumnCollectionMetadata).collection) {
          select.push(column.propertyName);
        }
      }
    }

    let query = '';
    for (const [index, propertyName] of select.entries()) {
      const column = model.columnsByPropertyName[propertyName];
      if (index > 0) {
        query += ',';
      }

      if (column.name !== propertyName) {
        query += `"${column.name}" AS "${propertyName}"`;
      } else {
        query += `"${propertyName}"`;
      }
    }

    return query;
  }

  /**
   * Builds the SQL where statement based on the where expression
   * @param {Object} repositoriesByModelNameLowered - All model schemas organized by global id
   * @param {Object} model - Model schema
   * @param {Object} [where]
   * @param {Array} [params] - Objects to pass as parameters for the query
   * @returns {{whereStatement?: string, params: Array}}
   * @private
   */
  // tslint:disable-next-line:function-name
  public static _buildWhereStatement({
    repositoriesByModelNameLowered,
    model,
    where,
    params = [],
  }: {
    repositoriesByModelNameLowered: RepositoriesByModelNameLowered;
    model: ModelMetadata;
    where?: WhereQuery;
    params?: any[];
  }): {
    whereStatement?: string;
    params: any[];
  } {
    let whereStatement;
    if (_.isObject(where)) {
      whereStatement = this._buildWhere({
        repositoriesByModelNameLowered,
        model,
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
   * Builds the SQL order by statement based on the array of sortable expressions
   * @param {Object} model - Model schema
   * @param {string[]|Object[]} sorts - Property name(s) to sort by
   * @returns {string} SQL order by statement
   * @private
   */
  // tslint:disable-next-line:function-name
  public static _buildOrderStatement({
    model,
    sorts,
  }: {
    model: ModelMetadata;
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
      const column = model.columnsByPropertyName[propertyName];
      if (!column) {
        throw new Error(`Property (${propertyName}) not found in model (${model.name}).`);
      }

      orderStatement += `"${column.name}"`;

      if (order && (order === -1 || order === '-1' || /desc/i.test(`${order}`))) {
        orderStatement += ' DESC';
      }
    }

    return orderStatement;
  }

  /**
   * Builds a portion of the where statement based on the propertyName
   * @param {Object} repositoriesByModelNameLowered - All model schemas organized by global id
   * @param {Object} model - Model schema
   * @param {string} [propertyName] - Name of property to query by
   * @param {string} [comparer] - Comparison operator
   * @param {Boolean} [isNegated=false] - If it is negated comparison
   * @param {Object|string|Number|boolean} [value] - Value to compare. Can also represent a complex where query
   * @param {Array} params - Objects to pass as parameters for the query
   * @returns {string} - Query text
   * @private
   */
  private static _buildWhere({
    repositoriesByModelNameLowered,
    model,
    propertyName,
    comparer,
    isNegated = false,
    value,
    params = [],
  }: {
    repositoriesByModelNameLowered: RepositoriesByModelNameLowered;
    model: ModelMetadata;
    propertyName?: string;
    comparer?: Comparer | string;
    isNegated?: boolean;
    value?: WhereClauseValue;
    params: any[];
  }): string {
    switch (comparer || propertyName) {
      case '!':
      case 'not':
        return this._buildWhere({
          repositoriesByModelNameLowered,
          model,
          propertyName,
          isNegated: true,
          value,
          params,
        });
      case 'or':
        return this._buildOrOperatorStatement({
          repositoriesByModelNameLowered,
          model,
          isNegated,
          value: value as string[] | number[],
          params,
        });
      case 'contains':
        if (_.isArray(value)) {
          const values =  (value as string[]).map((val) => {
            if (!_.isString(val)) {
              throw new Error(`Expected all array values to be strings for "contains" constraint. Property (${propertyName}) in model (${model.name}).`);
            }

            return `%${val}%`;
          });

          return this._buildWhere({
            repositoriesByModelNameLowered,
            model,
            propertyName,
            comparer: 'like',
            isNegated,
            value: values,
            params,
          });
        }

        if (_.isString(value)) {
          return this._buildWhere({
            repositoriesByModelNameLowered,
            model,
            propertyName,
            comparer: 'like',
            isNegated,
            value: `%${value}%`,
            params,
          });
        }

        throw new Error(`Expected value to be a string for "contains" constraint. Property (${propertyName}) in model (${model.name}).`);
      case 'startsWith':
        if (_.isArray(value)) {
          const values = (value as string[]).map((val) => {
            if (!_.isString(val)) {
              throw new Error(`Expected all array values to be strings for "startsWith" constraint. Property (${propertyName}) in model (${model.name}).`);
            }

            return `${val}%`;
          });

          return this._buildWhere({
            repositoriesByModelNameLowered,
            model,
            propertyName,
            comparer: 'like',
            isNegated,
            value: values,
            params,
          });
        }

        if (_.isString(value)) {
          return this._buildWhere({
            repositoriesByModelNameLowered,
            model,
            propertyName,
            comparer: 'like',
            isNegated,
            value: `${value}%`,
            params,
          });
        }

        throw new Error(`Expected value to be a string for "startsWith" constraint. Property (${propertyName}) in model (${model.name}).`);
      case 'endsWith':
        if (_.isArray(value)) {
          const values =  (value as string[]).map((val) => {
            if (!_.isString(val)) {
              throw new Error(`Expected all array values to be strings for "endsWith" constraint. Property (${propertyName}) in model (${model.name}).`);
            }

            return `%${val}`;
          });

          return this._buildWhere({
            repositoriesByModelNameLowered,
            model,
            propertyName,
            comparer: 'like',
            isNegated,
            value: values,
            params,
          });
        }

        if (_.isString(value)) {
          return this._buildWhere({
            repositoriesByModelNameLowered,
            model,
            propertyName,
            comparer: 'like',
            isNegated,
            value: `%${value}`,
            params,
          });
        }

        throw new Error(`Expected value to be a string for "endsWith" constraint. Property (${propertyName}) in model (${model.name}).`);
      case 'like':
        return this._buildLikeOperatorStatement({
          model,
          propertyName,
          isNegated,
          value,
          params,
        });
      default: {
        if (_.isUndefined(value)) {
          throw new Error(`Attempting to query with an undefined value. ${propertyName || ''} on ${model.name}`);
        }

        if (propertyName) {
          const column = model.columnsByPropertyName[propertyName] as ColumnModelMetadata;
          if (column && column.model && _.isObject(value)) {
            const relatedModelRepository = repositoriesByModelNameLowered[column.model.toLowerCase()];

            if (!relatedModelRepository) {
              throw new Error(`Unable to find model schema (${column.model}) specified in where clause for "${column.propertyName}"`);
            }

            const relatedModelPrimaryKey = relatedModelRepository.model.primaryKeyColumn;
            if (!relatedModelPrimaryKey) {
              throw new Error(`Unable to find primary key column for ${column.model} specified in where clause for ${model.name}.${column.propertyName}`);
            }

            const primaryKeyValue = (value as Partial<Entity>)[relatedModelPrimaryKey.propertyName];
            if (!_.isNil(primaryKeyValue)) {
                  // Treat `value` as a hydrated object
              return this._buildWhere({
                repositoriesByModelNameLowered,
                model,
                propertyName,
                comparer,
                isNegated,
                value: primaryKeyValue,
                params,
              });
            }
          }
        }

        if (_.isArray(value)) {
          if (!value.length) {
            const columnTypeFromPropertyName = propertyName ? model.columnsByPropertyName[propertyName] as ColumnTypeMetadata : null;
            const columnTypeFromComparer = comparer ? model.columnsByPropertyName[comparer] as ColumnTypeMetadata : null;
            const arrayColumn = columnTypeFromPropertyName || columnTypeFromComparer;

            if (arrayColumn) {
              const arrayColumnType = arrayColumn.type ? arrayColumn.type.toLowerCase() : '';
              if (arrayColumnType === 'array' || arrayColumnType === 'string[]' || arrayColumnType === 'integer[]' || arrayColumnType === 'float[]' || arrayColumnType === 'boolean[]') {
                return `"${arrayColumn.name}"${isNegated ? '<>' : '='}'{}'`;
              }
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
                repositoriesByModelNameLowered,
                model,
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
              repositoriesByModelNameLowered,
              model,
              propertyName,
              isNegated,
              value: valueWithoutNull[0],
              params,
            }));
          } else if (valueWithoutNull.length) {
            const columnTypeFromPropertyName = propertyName ? model.columnsByPropertyName[propertyName] as ColumnTypeMetadata : null;
            const columnTypeFromComparer = comparer ? model.columnsByPropertyName[comparer] as ColumnTypeMetadata : null;
            const columnType = columnTypeFromPropertyName || columnTypeFromComparer;

            if (columnType) {
              const columnTypeLowered = columnType.type ? columnType.type.toLowerCase() : '';
              if (columnTypeLowered === 'array' || columnTypeLowered === 'string[]' || columnTypeLowered === 'integer[]' || columnTypeLowered === 'float[]' || columnTypeLowered === 'boolean[]') {
                for (const val of valueWithoutNull) {
                  orConstraints.push(this._buildWhere({
                    repositoriesByModelNameLowered,
                    model,
                    propertyName,
                    isNegated,
                    value: val,
                    params,
                  }));
                }
              } else {
                let castType;
                switch (columnTypeLowered) {
                  case 'int':
                  case 'integer':
                  case 'integer[]':
                    castType = '::INTEGER[]';
                    break;
                  case 'float':
                  case 'float[]':
                    castType = '::NUMERIC[]';
                    break;
                  case 'boolean':
                  case 'boolean[]':
                    castType = '::BOOLEAN[]';
                    break;
                  default:
                    castType = '::TEXT[]';
                    break;
                }

                params.push(valueWithoutNull);
                orConstraints.push(`"${columnType.name}"${isNegated ? '<>ALL' : '=ANY'}($${params.length}${castType})`);
              }
            }

            // TODO: Validate that when columnType is null, it is expected to return existing constraints
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
              repositoriesByModelNameLowered,
              model,
              propertyName,
              comparer: subQueryComparer,
              isNegated,
              value: where,
              params,
            }));
          }

          return andValues.join(' AND ');
        }

        return this._buildComparisonOperatorStatement({
          model,
          propertyName: propertyName!,
          comparer,
          isNegated,
          value,
          params,
        });
      }
    }
  }

  private static _buildOrOperatorStatement({
                                             repositoriesByModelNameLowered,
                                             model,
                                             isNegated,
                                             value,
                                             params = [],
                                           }: {
                                             repositoriesByModelNameLowered: RepositoriesByModelNameLowered;
                                             model: ModelMetadata;
                                             isNegated: boolean;
                                             value: string[] | number[];
                                             params: any[];
                                           }) {
    const orClauses = [];
    for (const constraint of value) {
      const orClause = this._buildWhere({
        repositoriesByModelNameLowered,
        model,
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

  private static _buildLikeOperatorStatement({
    model,
    propertyName,
                                               isNegated,
    value,
                                               params,
                                             }: {
                                               model: ModelMetadata;
                                               propertyName?: string;
                                               comparer?: Comparer | string;
                                               isNegated: boolean;
                                               value?: WhereClauseValue;
                                               params: any[];
                                             }) {
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

        // NOTE: This is doing a case-insensitive pattern match
        params.push(lowerValues);

        const column = model.columnsByPropertyName[propertyName!];
        if (!column) {
          throw new Error(`Unable to find property ${propertyName} on model ${model.name}`);
        }

        const columnType = (column as ColumnTypeMetadata).type && (column as ColumnTypeMetadata).type.toLowerCase();
        if (columnType === 'array' || columnType === 'string[]') {
          return `EXISTS(SELECT 1 FROM (SELECT unnest("${column.name}") AS "unnested_${column.name}") __unnested WHERE lower("unnested_${column.name}")${isNegated ? '<>ALL' : '=ANY'}($${params.length}::TEXT[]))`;
        }

        return `lower("${column.name}")${isNegated ? '<>ALL' : '=ANY'}($${params.length}::TEXT[])`;
      }

      // tslint:disable-next-line:no-parameter-reassignment
      value = _.first(value as string[]);
    }

    if (_.isString(value)) {
      const column = model.columnsByPropertyName[propertyName!];
      if (!column) {
        throw new Error(`Unable to find property ${propertyName} on model ${model.name}`);
      }

      if (value) {
        // NOTE: This is doing a case-insensitive pattern match
        params.push(value);

        const columnType = (column as ColumnTypeMetadata).type && (column as ColumnTypeMetadata).type.toLowerCase();
        if (columnType === 'array' || columnType === 'string[]') {
          return `${isNegated ? 'NOT ' : ''}EXISTS(SELECT 1 FROM (SELECT unnest("${column.name}") AS "unnested_${column.name}") __unnested WHERE "unnested_${column.name}" ILIKE $${params.length})`;
        }

        return `"${column.name}"${isNegated ? ' NOT' : ''} ILIKE $${params.length}`;
      }

      return `"${column.name}" ${isNegated ? '!=' : '='} ''`;
    }

    throw new Error(`Expected value to be a string for "like" constraint. Property (${propertyName}) in model (${model.name}).`);
  }

  private static _buildComparisonOperatorStatement({
                                                     model,
                                                     propertyName,
                                                     comparer,
                                                     isNegated,
                                                     value,
                                                     params = [],
                                                   }: {
                                                     model: ModelMetadata;
                                                     propertyName: string;
                                                     comparer?: Comparer | string;
                                                     isNegated: boolean;
                                                     value: string | number | Date | boolean | WhereQuery | null | Entity;
                                                     params: any[];
                                                   }) {
    const column = model.columnsByPropertyName[propertyName];
    if (!column) {
      throw new Error(`Unable to find property ${propertyName} on model ${model.name}`);
    }

    if (_.isNull(value)) {
      return `"${column.name}" ${isNegated ? 'IS NOT' : 'IS'} NULL`;
    }

    params.push(value);

    const columnType = (column as ColumnTypeMetadata).type;
    const supportsLessThanGreaterThan = columnType !== 'array' && columnType !== 'json';

    switch (comparer) {
      case '<':
        if (!supportsLessThanGreaterThan) {
          throw new Error(`< operator is not supported for ${columnType || 'unknown'} type. ${propertyName || ''} on ${model.name}`);
        }

        return `"${column.name}"${isNegated ? '>=' : '<'}$${params.length}`;
      case '<=':
        if (!supportsLessThanGreaterThan) {
          throw new Error(`<= operator is not supported for ${columnType || 'unknown'} type. ${propertyName || ''} on ${model.name}`);
        }

        return `"${column.name}"${isNegated ? '>' : '<='}$${params.length}`;
      case '>':
        if (!supportsLessThanGreaterThan) {
          throw new Error(`> operator is not supported for ${columnType || 'unknown'} type. ${propertyName || ''} on ${model.name}`);
        }

        return `"${column.name}"${isNegated ? '<=' : '>'}$${params.length}`;
      case '>=':
        if (!supportsLessThanGreaterThan) {
          throw new Error(`>= operator is not supported for ${columnType || 'unknown'} type. ${propertyName || ''} on ${model.name}`);
        }

        return `"${column.name}"${isNegated ? '<' : '>='}$${params.length}`;
      default:
        if (columnType === 'array') {
          return `$${params.length}${isNegated ? '<>ALL(' : '=ANY('}"${column.name}")`;
        }

        return `"${column.name}"${isNegated ? '<>' : '='}$${params.length}`;
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
