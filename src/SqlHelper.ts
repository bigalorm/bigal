import * as _ from 'lodash';

import type { Entity, EntityFieldValue } from './Entity';
import type { IReadonlyRepository } from './IReadonlyRepository';
import type { IRepository } from './IRepository';
import type {
  ColumnCollectionMetadata, //
  ColumnModelMetadata,
  ColumnTypeMetadata,
  ModelMetadata,
} from './metadata';
import type { Comparer, OrderBy, WhereClauseValue, WhereQuery } from './query';

interface QueryAndParams {
  query: string;
  params: unknown[];
}

/* eslint-disable @typescript-eslint/no-use-before-define */

/**
 * Gets the select syntax for the specified model and filters
 * @param {object} args - Arguments
 * @param {object} args.repositoriesByModelNameLowered - All model schemas organized by model name
 * @param {object} args.model - Model schema
 * @param {string[]} [args.select] - Array of model property names to return from the query.
 * @param {object} [args.where] - Object representing the where query
 * @param {string[]|object[]} [args.sorts] - Property name(s) to sort by
 * @param {number} [args.skip] - Number of records to skip
 * @param {number} [args.limit] - Number of results to return
 * @returns {{query: string, params: object[]}}
 */
export function getSelectQueryAndParams<T extends Entity>({
  repositoriesByModelNameLowered,
  model,
  select,
  where,
  sorts,
  skip,
  limit,
}: {
  repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;
  model: ModelMetadata<T>;
  select?: (string & keyof T)[];
  where?: WhereQuery<T>;
  sorts: OrderBy<T>[];
  skip: number;
  limit: number;
}): QueryAndParams {
  let query = 'SELECT ';

  query += getColumnsToSelect({
    model,
    select,
  });

  query += ` FROM "${model.tableName}"`;

  const { whereStatement, params } = buildWhereStatement({
    repositoriesByModelNameLowered,
    model,
    where,
  });

  if (whereStatement) {
    query += ` ${whereStatement}`;
  }

  const orderStatement = buildOrderStatement({
    model,
    sorts,
  });

  if (orderStatement) {
    query += ` ${orderStatement}`;
  }

  if (limit) {
    if (_.isString(limit)) {
      // eslint-disable-next-line no-param-reassign
      limit = Number(limit);
    }

    if (!_.isFinite(limit)) {
      throw new Error('Limit should be a number');
    }

    query += ` LIMIT ${limit}`;
  }

  if (skip) {
    if (_.isString(skip)) {
      // eslint-disable-next-line no-param-reassign
      skip = Number(skip);
    }

    if (!_.isFinite(skip)) {
      throw new Error('Skip should be a number');
    }

    query += ` OFFSET ${skip}`;
  }

  if (process.env.DEBUG_BIGAL?.toLowerCase() === 'true') {
    // eslint-disable-next-line no-console
    console.log({ generatedBigalQuery: query });
  }

  return {
    query,
    params,
  };
}

/**
 * Gets the count syntax for the specified model and values
 * @param {object} args - Arguments
 * @param {object} args.repositoriesByModelNameLowered - All model schemas organized by model name
 * @param {object} args.model - Model schema
 * @param {object} [args.where] - Object representing the where query
 * @returns {{query: string, params: object[]}}
 */
export function getCountQueryAndParams<T extends Entity>({
  repositoriesByModelNameLowered,
  model,
  where,
}: {
  repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;
  model: ModelMetadata<T>;
  where?: WhereQuery<T>;
}): QueryAndParams {
  let query = `SELECT count(*) AS "count" FROM "${model.tableName}"`;

  const { whereStatement, params } = buildWhereStatement({
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
 * @param {object} args - Arguments
 * @param {object} args.repositoriesByModelNameLowered - All model schemas organized by model name
 * @param {object} args.model - Model schema
 * @param {object|object[]} args.values - Values to insert. Insert multiple records by passing an array of values.
 * @param {boolean} [args.returnRecords=true] - Determines if inserted records should be returned
 * @param {string[]} [args.returnSelect] - Array of model property names to return from the query.
 * @returns {{query: string, params: object[]}}
 */
export function getInsertQueryAndParams<T extends Entity>({
  repositoriesByModelNameLowered,
  model,
  values,
  returnRecords = true,
  returnSelect,
}: {
  repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;
  model: ModelMetadata<T>;
  values: Partial<T> | Partial<T>[];
  returnRecords?: boolean;
  returnSelect?: (string & keyof T)[];
}): QueryAndParams {
  const entitiesToInsert = _.isArray(values) ? values : [values];
  const columnsToInsert = [];
  // Set defaulted property values and verify required columns have a value specified
  for (const column of model.columns) {
    const collectionColumn = column as ColumnCollectionMetadata;
    if (!collectionColumn.collection) {
      const { defaultsTo } = column as ColumnTypeMetadata;
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
        if (hasDefaultValue && _.isUndefined(entity[column.propertyName as string & keyof T])) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - string is not assignable to T[string & keyof T] | undefined
          entity[column.propertyName as string & keyof T] = defaultValue;
        }

        if (_.isUndefined(entity[column.propertyName as string & keyof T])) {
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
      const entityValue = entity[column.propertyName as string & keyof T] as EntityFieldValue;
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

          const primaryKeyValue = (entityValue as Partial<T>)[relatedModelPrimaryKey.propertyName as string & keyof T] as EntityFieldValue;
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
    query += getColumnsToSelect({
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
 * @param {object} args - Arguments
 * @param {object} args.repositoriesByModelNameLowered - All model schemas organized by global id
 * @param {object} args.model - Model schema
 * @param {object} [args.where] - Object representing the where query
 * @param {object} args.values - Values to set.
 * @param {boolean} [args.returnRecords=true] - Determines if inserted records should be returned
 * @param {string[]} [args.returnSelect] - Array of model property names to return from the query.
 * @returns {{query: string, params: object[]}}
 */
export function getUpdateQueryAndParams<T extends Entity>({
  repositoriesByModelNameLowered,
  model,
  where,
  values = {},
  returnRecords = true,
  returnSelect,
}: {
  repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;
  model: ModelMetadata<T>;
  where: WhereQuery<T>;
  values: Partial<T>;
  returnRecords?: boolean;
  returnSelect?: (string & keyof T)[];
}): QueryAndParams {
  for (const column of model.updateDateColumns) {
    if (_.isUndefined(values[column.propertyName as string & keyof T])) {
      // eslint-disable-next-line no-param-reassign, @typescript-eslint/ban-ts-comment
      // @ts-ignore - Date is not assignable to T[string & keyof T]
      values[column.propertyName as string & keyof T] = new Date();
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

          const primaryKeyValue = (value as Partial<T>)[relatedModelPrimaryKey.propertyName as string & keyof T] as EntityFieldValue;
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
    if (!_.isUndefined(values[column.propertyName as string & keyof T])) {
      if (!isFirstProperty) {
        query += ',';
      }

      query += `"${column.name}"="${column.name}"+1`;

      isFirstProperty = false;
    }
  }

  const { whereStatement } = buildWhereStatement({
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
    query += getColumnsToSelect({
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
 * @param {object} args - Arguments
 * @param {object} args.repositoriesByModelNameLowered - All model schemas organized by global id
 * @param {object} args.model - Model schema
 * @param {object} [args.where] - Object representing the where query
 * @param {boolean} [args.returnRecords=true] - Determines if inserted records should be returned
 * @param {string[]} [args.returnSelect] - Array of model property names to return from the query.
 * @returns {{query: string, params: object[]}}
 */
export function getDeleteQueryAndParams<T extends Entity>({
  repositoriesByModelNameLowered,
  model,
  where,
  returnRecords = true,
  returnSelect,
}: {
  repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;
  model: ModelMetadata<T>;
  where?: WhereQuery<T>;
  returnRecords?: boolean;
  returnSelect?: (string & keyof T)[];
}): QueryAndParams {
  let query = `DELETE FROM "${model.tableName}"`;

  const { whereStatement, params } = buildWhereStatement({
    repositoriesByModelNameLowered,
    model,
    where,
  });

  if (whereStatement) {
    query += ` ${whereStatement}`;
  }

  if (returnRecords) {
    query += ' RETURNING ';
    query += getColumnsToSelect({
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
 * @param {object} args - Arguments
 * @param {object} args.model - Model schema
 * @param {string[]} [args.select] - Array of model property names to return from the query.
 * @returns {string} SQL columns
 * @private
 */
export function getColumnsToSelect<T extends Entity>({ model, select }: { model: ModelMetadata<T>; select?: (string & keyof T)[] }): string {
  if (select) {
    const { primaryKeyColumn } = model;

    // Include primary key column if it's not defined
    if (primaryKeyColumn && !select.includes(primaryKeyColumn.propertyName as string & keyof T)) {
      select.push(primaryKeyColumn.propertyName as string & keyof T);
    }
  } else {
    // eslint-disable-next-line no-param-reassign
    select = [];
    for (const column of model.columns) {
      if (!(column as ColumnCollectionMetadata).collection) {
        select.push(column.propertyName as string & keyof T);
      }
    }
  }

  let query = '';
  for (const [index, propertyName] of select.entries()) {
    const column = model.columnsByPropertyName[propertyName];
    if (!column) {
      throw new Error(`Unable to find column for property: ${propertyName} on ${model.tableName}`);
    }

    if (index > 0) {
      query += ',';
    }

    if (column.name === propertyName) {
      query += `"${propertyName}"`;
    } else {
      query += `"${column.name}" AS "${propertyName}"`;
    }
  }

  return query;
}

/**
 * Builds the SQL where statement based on the where expression
 * @param {object} args - Arguments
 * @param {object} args.repositoriesByModelNameLowered - All model schemas organized by global id
 * @param {object} args.model - Model schema
 * @param {object} [args.where]
 * @param {(number|string|object|null)[]} [args.params] - Objects to pass as parameters for the query
 * @returns {object} {{whereStatement?: string, params: Array}}
 * @private
 */
export function buildWhereStatement<T extends Entity>({
  repositoriesByModelNameLowered,
  model,
  where,
  params = [],
}: {
  repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;
  model: ModelMetadata<T>;
  where?: WhereQuery<T>;
  params?: unknown[];
}): {
  whereStatement?: string;
  params: unknown[];
} {
  let whereStatement;
  if (_.isObject(where)) {
    whereStatement = buildWhere({
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
 * @param {object} args - Arguments
 * @param {object} args.model - Model schema
 * @param {string[]|object[]} args.sorts - Property name(s) to sort by
 * @returns {string} SQL order by statement
 * @private
 */
export function buildOrderStatement<T extends Entity>({ model, sorts }: { model: ModelMetadata<T>; sorts: OrderBy<T>[] }): string {
  if (_.isNil(sorts) || !_.some(sorts)) {
    return '';
  }

  let orderStatement = 'ORDER BY ';

  for (const [index, orderProperty] of sorts.entries()) {
    if (index > 0) {
      orderStatement += ',';
    }

    const { propertyName, descending } = orderProperty;
    const column = model.columnsByPropertyName[propertyName];
    if (!column) {
      throw new Error(`Property (${propertyName}) not found in model (${model.name}).`);
    }

    orderStatement += `"${column.name}"`;

    if (descending) {
      orderStatement += ' DESC';
    }
  }

  return orderStatement;
}

/**
 * Builds a portion of the where statement based on the propertyName
 * @param {object} args - Arguments
 * @param {object} args.repositoriesByModelNameLowered - All model schemas organized by global id
 * @param {object} args.model - Model schema
 * @param {string} [args.propertyName] - Name of property to query by
 * @param {string} [args.comparer] - Comparison operator
 * @param {boolean} [args.isNegated=false] - If it is negated comparison
 * @param {object|string|number|boolean} [args.value] - Value to compare. Can also represent a complex where query
 * @param {object[]} args.params - Objects to pass as parameters for the query
 * @returns {string} - Query text
 * @private
 */
function buildWhere<T extends Entity>({
  repositoriesByModelNameLowered,
  model,
  propertyName,
  comparer,
  isNegated = false,
  value,
  params = [],
}: {
  repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;
  model: ModelMetadata<T>;
  propertyName?: string;
  comparer?: Comparer | string;
  isNegated?: boolean;
  value?: WhereClauseValue<T>;
  params: unknown[];
}): string {
  switch (comparer || propertyName) {
    case '!':
    case 'not':
      return buildWhere({
        repositoriesByModelNameLowered,
        model,
        propertyName,
        isNegated: true,
        value,
        params,
      });
    case 'or':
      return buildOrOperatorStatement({
        repositoriesByModelNameLowered,
        model,
        isNegated,
        value: value as number[] | string[],
        params,
      });
    case 'contains':
      if (_.isArray(value)) {
        const values = (value as string[]).map((val) => {
          if (!_.isString(val)) {
            throw new Error(`Expected all array values to be strings for "contains" constraint. Property (${propertyName || ''}) in model (${model.name}).`);
          }

          return `%${val}%`;
        });

        return buildWhere({
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
        return buildWhere({
          repositoriesByModelNameLowered,
          model,
          propertyName,
          comparer: 'like',
          isNegated,
          value: `%${value}%`,
          params,
        });
      }

      throw new Error(`Expected value to be a string for "contains" constraint. Property (${propertyName || ''}) in model (${model.name}).`);
    case 'startsWith':
      if (_.isArray(value)) {
        const values = (value as string[]).map((val) => {
          if (!_.isString(val)) {
            throw new Error(`Expected all array values to be strings for "startsWith" constraint. Property (${propertyName || ''}) in model (${model.name}).`);
          }

          return `${val}%`;
        });

        return buildWhere({
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
        return buildWhere({
          repositoriesByModelNameLowered,
          model,
          propertyName,
          comparer: 'like',
          isNegated,
          value: `${value}%`,
          params,
        });
      }

      throw new Error(`Expected value to be a string for "startsWith" constraint. Property (${propertyName || ''}) in model (${model.name}).`);
    case 'endsWith':
      if (_.isArray(value)) {
        const values = (value as string[]).map((val) => {
          if (!_.isString(val)) {
            throw new Error(`Expected all array values to be strings for "endsWith" constraint. Property (${propertyName || ''}) in model (${model.name}).`);
          }

          return `%${val}`;
        });

        return buildWhere({
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
        return buildWhere({
          repositoriesByModelNameLowered,
          model,
          propertyName,
          comparer: 'like',
          isNegated,
          value: `%${value}`,
          params,
        });
      }

      throw new Error(`Expected value to be a string for "endsWith" constraint. Property (${propertyName || ''}) in model (${model.name}).`);
    case 'like':
      return buildLikeOperatorStatement({
        model,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        propertyName: propertyName!,
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

          const primaryKeyValue = (value as Partial<T>)[relatedModelPrimaryKey.propertyName as string & keyof T] as EntityFieldValue;
          if (!_.isNil(primaryKeyValue)) {
            // Treat `value` as a hydrated object
            return buildWhere({
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
          const columnTypeFromPropertyName = propertyName ? (model.columnsByPropertyName[propertyName] as ColumnTypeMetadata) : null;
          const columnTypeFromComparer = comparer ? (model.columnsByPropertyName[comparer] as ColumnTypeMetadata) : null;
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
            orConstraints.push(
              buildWhere({
                repositoriesByModelNameLowered,
                model,
                propertyName,
                isNegated,
                value: null,
                params,
              }),
            );
          } else if (item === '') {
            orConstraints.push(
              buildWhere({
                repositoriesByModelNameLowered,
                model,
                propertyName,
                isNegated,
                value: '',
                params,
              }),
            );
          } else {
            valueWithoutNull.push(item);
          }
        }

        if (valueWithoutNull.length === 1) {
          orConstraints.push(
            buildWhere({
              repositoriesByModelNameLowered,
              model,
              propertyName,
              isNegated,
              value: valueWithoutNull[0] as EntityFieldValue,
              params,
            }),
          );
        } else if (valueWithoutNull.length) {
          const columnTypeFromPropertyName = propertyName ? (model.columnsByPropertyName[propertyName] as ColumnTypeMetadata) : null;
          const columnTypeFromComparer = comparer ? (model.columnsByPropertyName[comparer] as ColumnTypeMetadata) : null;
          const columnType = columnTypeFromPropertyName || columnTypeFromComparer;

          if (columnType) {
            const columnTypeLowered = columnType.type ? columnType.type.toLowerCase() : '';
            if (columnTypeLowered === 'array' || columnTypeLowered === 'string[]' || columnTypeLowered === 'integer[]' || columnTypeLowered === 'float[]' || columnTypeLowered === 'boolean[]') {
              for (const val of valueWithoutNull) {
                orConstraints.push(
                  buildWhere({
                    repositoriesByModelNameLowered,
                    model,
                    propertyName,
                    isNegated,
                    value: val as EntityFieldValue,
                    params,
                  }),
                );
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
        for (const [key, where] of Object.entries(value as WhereQuery<T>)) {
          let subQueryComparer: Comparer | string | undefined;
          if (isComparer(key)) {
            subQueryComparer = key;
          } else {
            // eslint-disable-next-line no-param-reassign
            propertyName = key;
          }

          andValues.push(
            buildWhere({
              repositoriesByModelNameLowered,
              model,
              propertyName,
              comparer: subQueryComparer,
              isNegated,
              value: where,
              params,
            }),
          );
        }

        return andValues.join(' AND ');
      }

      return buildComparisonOperatorStatement({
        model,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        propertyName: propertyName!,
        comparer,
        isNegated,
        value,
        params,
      });
    }
  }
}

function buildOrOperatorStatement<T extends Entity>({
  repositoriesByModelNameLowered,
  model,
  isNegated,
  value,
  params = [],
}: {
  repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;
  model: ModelMetadata<T>;
  isNegated: boolean;
  value: number[] | string[];
  params: unknown[];
}): string {
  const orClauses = [];
  for (const constraint of value) {
    const orClause = buildWhere({
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

interface ComparisonOperatorStatementParams<T extends Entity> {
  model: ModelMetadata<T>;
  propertyName: string;
  comparer?: Comparer | string;
  isNegated: boolean;
  value?: WhereClauseValue<T>;
  params: unknown[];
}

function buildLikeOperatorStatement<T extends Entity>({ model, propertyName, isNegated, value, params }: ComparisonOperatorStatementParams<T>): string {
  if (_.isArray(value)) {
    if (!value.length) {
      if (isNegated) {
        return '1=1';
      }

      return '1<>1';
    }

    if (value.length > 1) {
      const orConstraints = [];
      const valueWithoutNullOrEmpty = [];
      for (const item of value) {
        if (_.isNull(item)) {
          orConstraints.push(
            buildLikeOperatorStatement({
              model,
              propertyName,
              isNegated,
              value: null,
              params,
            }),
          );
        } else if (item === '') {
          orConstraints.push(
            buildLikeOperatorStatement({
              model,
              propertyName,
              isNegated,
              value: '',
              params,
            }),
          );
        } else {
          valueWithoutNullOrEmpty.push(item);
        }
      }

      if (orConstraints.length) {
        if (valueWithoutNullOrEmpty.length) {
          orConstraints.push(
            buildLikeOperatorStatement({
              model,
              propertyName,
              isNegated,
              value: valueWithoutNullOrEmpty,
              params,
            }),
          );
        }

        if (orConstraints.length === 1) {
          return orConstraints[0];
        }

        if (isNegated) {
          return orConstraints.join(' AND ');
        }

        return `(${orConstraints.join(' OR ')})`;
      }

      const lowerValues = (value as string[]).map((val) => val.toLowerCase());

      // NOTE: This is doing a case-insensitive pattern match
      params.push(lowerValues);

      const column = model.columnsByPropertyName[propertyName];
      if (!column) {
        throw new Error(`Unable to find property ${propertyName} on model ${model.name}`);
      }

      const columnType = (column as ColumnTypeMetadata).type && (column as ColumnTypeMetadata).type.toLowerCase();
      if (columnType === 'array' || columnType === 'string[]') {
        return `EXISTS(SELECT 1 FROM (SELECT unnest("${column.name}") AS "unnested_${column.name}") __unnested WHERE lower("unnested_${column.name}")${isNegated ? '<>ALL' : '=ANY'}($${
          params.length
        }::TEXT[]))`;
      }

      return `lower("${column.name}")${isNegated ? '<>ALL' : '=ANY'}($${params.length}::TEXT[])`;
    }

    // eslint-disable-next-line no-param-reassign
    value = _.first(value as string[]);
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const column = model.columnsByPropertyName[propertyName];
  if (!column) {
    throw new Error(`Unable to find property ${propertyName} on model ${model.name}`);
  }

  if (_.isNull(value)) {
    return `"${column.name}" ${isNegated ? 'IS NOT' : 'IS'} NULL`;
  }

  if (_.isString(value)) {
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

function buildComparisonOperatorStatement<T extends Entity>({ model, propertyName, comparer, isNegated, value, params = [] }: ComparisonOperatorStatementParams<T>): string {
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
      if (columnType && (columnType === 'array' || columnType.endsWith('[]'))) {
        return `$${params.length}${isNegated ? '<>ALL(' : '=ANY('}"${column.name}")`;
      }

      return `"${column.name}"${isNegated ? '<>' : '='}$${params.length}`;
  }
}

/**
 * Determines if the specified value is a comparer
 * @param {string} value
 * @returns {boolean}
 * @private
 */
function isComparer(value: string): boolean {
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
/* eslint-enable @typescript-eslint/no-use-before-define */
