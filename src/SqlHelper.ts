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
import type { OnConflictOptions } from './query/OnConflictOptions';
import type { CreateUpdateParams, OmitEntityCollections, OmitFunctions } from './types';

interface QueryAndParams {
  query: string;
  params: readonly unknown[];
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
  select?: readonly (string & keyof OmitFunctions<OmitEntityCollections<T>>)[];
  where?: WhereQuery<T>;
  sorts: readonly OrderBy<T>[];
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
    console.log(`BigAl: ${query}`);
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
 * @param {object} [args.onConflict] - Options to handle conflicts due to a unique constraint or exclusion constraint error during insert
 * @param {boolean} [args.returnRecords=true] - Determines if inserted records should be returned
 * @param {string[]} [args.returnSelect] - Array of model property names to return from the query.
 * @returns {{query: string, params: object[]}}
 */
export function getInsertQueryAndParams<T extends Entity, K extends string & keyof OmitFunctions<OmitEntityCollections<T>> = string & keyof OmitFunctions<OmitEntityCollections<T>>>({
  repositoriesByModelNameLowered,
  model,
  values,
  returnRecords = true,
  returnSelect,
  onConflict,
}: {
  repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;
  model: ModelMetadata<T>;
  values: CreateUpdateParams<T> | CreateUpdateParams<T>[];
  returnRecords?: boolean;
  returnSelect?: readonly K[];
  onConflict?: OnConflictOptions<T, K>['onConflict'];
}): QueryAndParams {
  const entitiesToInsert = _.isArray(values) ? values : [values];
  const conflictTargetColumns = [];
  const columnsToInsert = [];
  const columnsToMerge = [];
  let hasEmptyMergeColumns = false;
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
        if (hasDefaultValue && _.isUndefined(entity[column.propertyName as string & keyof CreateUpdateParams<T>])) {
          // @ts-expect-error - string is not assignable to T[string & keyof T] | undefined
          entity[column.propertyName as string & keyof CreateUpdateParams<T>] = defaultValue;
        }

        if (_.isUndefined(entity[column.propertyName as string & keyof CreateUpdateParams<T>])) {
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

      if (onConflict) {
        if (
          (Array.isArray(onConflict.targets) && onConflict.targets.includes(column.propertyName as K)) ||
          (!Array.isArray(onConflict.targets) && onConflict.targets.columns.includes(column.propertyName as K))
        ) {
          conflictTargetColumns.push(column);
        }

        if (onConflict.action === 'merge') {
          const mergeColumns = Array.isArray(onConflict.merge) ? onConflict.merge : onConflict.merge?.columns;
          if (mergeColumns) {
            hasEmptyMergeColumns = !mergeColumns.length;
            if (mergeColumns.includes(column.propertyName as K)) {
              columnsToMerge.push(column);
            }
          } else if (!column.createDate && !column.primary) {
            columnsToMerge.push(column);
          }
        }
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
      const entityValue = entity[column.propertyName as string & keyof CreateUpdateParams<T>] as EntityFieldValue;
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

          const primaryKeyValue = (entityValue as Partial<T>)[relatedModelPrimaryKey.propertyName as string & keyof CreateUpdateParams<T> & keyof T] as EntityFieldValue;
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

      const valuesForEntityIndex = valueCollections[entityIndex];
      if (!valuesForEntityIndex) {
        throw new Error('Error trying to get insert values for entity index');
      }

      valuesForEntityIndex.push(value);
    }
  }

  query += ') VALUES ';
  for (const [index, valueCollection] of valueCollections.entries()) {
    if (index > 0) {
      query += ',';
    }

    query += `(${valueCollection.join(',')})`;
  }

  if (onConflict) {
    query += ' ON CONFLICT (';
    for (const [index, targetColumn] of conflictTargetColumns.entries()) {
      if (index > 0) {
        query += ',';
      }

      query += `"${targetColumn.name}"`;
    }

    query += ') ';

    // ON CONFLICT (foo, bar) WHERE baz = 1
    if (!Array.isArray(onConflict.targets)) {
      const { whereStatement } = buildWhereStatement({
        repositoriesByModelNameLowered,
        model,
        where: onConflict.targets.where,
        params,
      });

      if (whereStatement) {
        query += `${whereStatement} `;
      }
    }

    if (onConflict.action === 'ignore' || hasEmptyMergeColumns) {
      query += 'DO NOTHING';
    } else {
      query += 'DO UPDATE SET ';

      for (const [index, column] of columnsToMerge.entries()) {
        if (index > 0) {
          query += ',';
        }

        if (column.version) {
          query += `"${column.name}"="${column.name}"+1`;
        } else {
          query += `"${column.name}"=EXCLUDED."${column.name}"`;
        }
      }

      if (!Array.isArray(onConflict.merge) && onConflict.merge?.where) {
        const { whereStatement } = buildWhereStatement({
          repositoriesByModelNameLowered,
          model,
          where: onConflict.merge.where,
          params,
        });

        if (whereStatement) {
          query += ` ${whereStatement}`;
        }
      }
    }
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
  values: CreateUpdateParams<T>;
  returnRecords?: boolean;
  returnSelect?: (string & keyof OmitFunctions<OmitEntityCollections<T>>)[];
}): QueryAndParams {
  for (const column of model.updateDateColumns) {
    if (_.isUndefined(values[column.propertyName as string & keyof CreateUpdateParams<T>])) {
      // eslint-disable-next-line no-param-reassign, @typescript-eslint/ban-ts-comment
      // @ts-expect-error - Date is not assignable to T[string & keyof T]
      values[column.propertyName as string & keyof CreateUpdateParams<T>] = new Date();
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

          const primaryKeyValue = (value as Partial<T>)[relatedModelPrimaryKey.propertyName as string & keyof CreateUpdateParams<T> & keyof T] as EntityFieldValue;
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
    if (!_.isUndefined(values[column.propertyName as string & keyof CreateUpdateParams<T>])) {
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
  returnSelect?: readonly (string & keyof OmitFunctions<OmitEntityCollections<T>>)[];
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
export function getColumnsToSelect<T extends Entity, K extends string & keyof OmitFunctions<OmitEntityCollections<T>> = string & keyof OmitFunctions<OmitEntityCollections<T>>>({
  model,
  select,
}: {
  model: ModelMetadata<T>;
  select?: readonly K[];
}): string {
  let selectColumns: Set<string>;
  if (select) {
    const { primaryKeyColumn } = model;

    selectColumns = new Set(select);

    // Ensure primary key column is specified
    if (primaryKeyColumn) {
      selectColumns.add(primaryKeyColumn.propertyName);
    }
  } else {
    // eslint-disable-next-line no-param-reassign
    selectColumns = new Set();
    for (const column of model.columns) {
      if (!(column as ColumnCollectionMetadata).collection) {
        selectColumns.add(column.propertyName);
      }
    }
  }

  let query = '';
  for (const [index, propertyName] of Array.from(selectColumns).entries()) {
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
export function buildOrderStatement<T extends Entity>({ model, sorts }: { model: ModelMetadata<T>; sorts: readonly OrderBy<T>[] }): string {
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
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  comparer?: Comparer | string;
  isNegated?: boolean;
  value?: WhereClauseValue<string> | WhereClauseValue<T> | WhereQuery<T> | string | readonly WhereQuery<T>[];
  params: unknown[];
}): string {
  switch (comparer ?? propertyName) {
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
        value: value as WhereQuery<T>[],
        params,
      });
    case 'contains':
      if (_.isArray(value)) {
        const values = (value as string[]).map((val) => {
          if (!_.isString(val)) {
            throw new Error(`Expected all array values to be strings for "contains" constraint. Property (${propertyName ?? ''}) in model (${model.name}).`);
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

      throw new Error(`Expected value to be a string for "contains" constraint. Property (${propertyName ?? ''}) in model (${model.name}).`);
    case 'startsWith':
      if (_.isArray(value)) {
        const values = (value as string[]).map((val) => {
          if (!_.isString(val)) {
            throw new Error(`Expected all array values to be strings for "startsWith" constraint. Property (${propertyName ?? ''}) in model (${model.name}).`);
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

      throw new Error(`Expected value to be a string for "startsWith" constraint. Property (${propertyName ?? ''}) in model (${model.name}).`);
    case 'endsWith':
      if (_.isArray(value)) {
        const values = (value as string[]).map((val) => {
          if (!_.isString(val)) {
            throw new Error(`Expected all array values to be strings for "endsWith" constraint. Property (${propertyName ?? ''}) in model (${model.name}).`);
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

      throw new Error(`Expected value to be a string for "endsWith" constraint. Property (${propertyName ?? ''}) in model (${model.name}).`);
    case 'like':
      return buildLikeOperatorStatement({
        model,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        propertyName: propertyName!,
        isNegated,
        value: value as LikeOperatorStatementParams<T>['value'],
        params,
      });
    default: {
      if (_.isUndefined(value)) {
        throw new Error(`Attempting to query with an undefined value. ${propertyName ?? ''} on ${model.name}`);
      }

      if (propertyName) {
        const column = model.columnsByPropertyName[propertyName] as ColumnModelMetadata;
        if (column && _.isObject(value)) {
          if (column.primary) {
            const primaryKeyValue = (value as unknown as Partial<T>)[column.propertyName as string & keyof T];
            if (!_.isNil(primaryKeyValue)) {
              // Treat `value` as a hydrated object
              return buildWhere({
                repositoriesByModelNameLowered,
                model,
                propertyName,
                comparer,
                isNegated,
                value: primaryKeyValue as WhereClauseValue<T>,
                params,
              });
            }
          } else if (column.model) {
            const relatedModelRepository = repositoriesByModelNameLowered[column.model.toLowerCase()];

            if (!relatedModelRepository) {
              throw new Error(`Unable to find model schema (${column.model}) specified in where clause for "${column.propertyName}"`);
            }

            const relatedModelPrimaryKey = relatedModelRepository.model.primaryKeyColumn;
            if (!relatedModelPrimaryKey) {
              throw new Error(`Unable to find primary key column for ${column.model} specified in where clause for ${model.name}.${column.propertyName}`);
            }

            const primaryKeyValue = (value as unknown as Partial<T>)[relatedModelPrimaryKey.propertyName as string & keyof T];
            if (!_.isNil(primaryKeyValue)) {
              // Treat `value` as a hydrated object
              return buildWhere({
                repositoriesByModelNameLowered,
                model,
                propertyName,
                comparer,
                isNegated,
                value: primaryKeyValue as WhereClauseValue<T>,
                params,
              });
            }
          }
        }
      }

      if (_.isArray(value)) {
        if (!value.length) {
          const columnTypeFromPropertyName = propertyName ? (model.columnsByPropertyName[propertyName] as ColumnTypeMetadata) : null;
          const columnTypeFromComparer = comparer ? (model.columnsByPropertyName[comparer] as ColumnTypeMetadata) : null;
          const arrayColumn = columnTypeFromPropertyName ?? columnTypeFromComparer;

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
              value: valueWithoutNull[0] as WhereClauseValue<T>,
              params,
            }),
          );
        } else if (valueWithoutNull.length) {
          const columnTypeFromPropertyName = propertyName ? (model.columnsByPropertyName[propertyName] as ColumnTypeMetadata) : null;
          const columnTypeFromComparer = comparer ? (model.columnsByPropertyName[comparer] as ColumnTypeMetadata) : null;
          const columnType = columnTypeFromPropertyName ?? columnTypeFromComparer;

          if (columnType) {
            let columnTypeLowered = columnType.type ? columnType.type.toLowerCase() : '';
            if (columnTypeLowered === 'array' || columnTypeLowered === 'string[]' || columnTypeLowered === 'integer[]' || columnTypeLowered === 'float[]' || columnTypeLowered === 'boolean[]') {
              for (const val of valueWithoutNull) {
                orConstraints.push(
                  buildWhere({
                    repositoriesByModelNameLowered,
                    model,
                    propertyName,
                    isNegated,
                    value: val as WhereClauseValue<T>,
                    params,
                  }),
                );
              }
            } else {
              // If it's an array of values for a model relationship, try to find the type of the primary key for the related model
              if (!columnTypeLowered) {
                const columnAsModelType = columnType as unknown as ColumnModelMetadata;
                if (columnAsModelType.model) {
                  const relatedModelRepository = repositoriesByModelNameLowered[columnAsModelType.model.toLowerCase()];

                  if (!relatedModelRepository) {
                    throw new Error(`Unable to find model schema (${columnAsModelType.model}) specified in where clause for "${columnAsModelType.propertyName}"`);
                  }

                  const relatedModelPrimaryKey = relatedModelRepository.model.primaryKeyColumn as ColumnTypeMetadata;
                  if (!relatedModelPrimaryKey) {
                    throw new Error(`Unable to find primary key column for ${columnAsModelType.model} specified in where clause for ${model.name}.${columnAsModelType.propertyName}`);
                  }

                  columnTypeLowered = relatedModelPrimaryKey.type ? relatedModelPrimaryKey.type.toLowerCase() : '';
                }
              }

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
          return orConstraints[0] ?? '';
        }

        if (isNegated) {
          return orConstraints.join(' AND ');
        }

        return `(${orConstraints.join(' OR ')})`;
      }

      if (_.isObject(value) && !_.isDate(value)) {
        const andValues: string[] = [];
        for (const [key, where] of Object.entries(value)) {
          // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
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
              value: where as WhereClauseValue<T>,
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
        value: value as WhereClauseValue<T>,
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
  value: readonly WhereQuery<T>[];
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
    return orClauses[0] ?? '';
  }

  if (isNegated) {
    return orClauses.join(' AND ');
  }

  return `(${orClauses.join(' OR ')})`;
}

interface ComparisonOperatorStatementParams<T extends Entity> {
  model: ModelMetadata<T>;
  propertyName: string;
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  comparer?: Comparer | string;
  isNegated: boolean;
  value?: WhereClauseValue<T> | string | readonly string[];
  params: unknown[];
}

interface LikeOperatorStatementParams<T extends Entity> extends Omit<ComparisonOperatorStatementParams<T>, 'value'> {
  value: string | readonly string[] | null;
}

function buildLikeOperatorStatement<T extends Entity>({ model, propertyName, isNegated, value, params }: LikeOperatorStatementParams<T>): string {
  if (_.isArray(value)) {
    if (!value.length) {
      if (isNegated) {
        return '1=1';
      }

      return '1<>1';
    }

    if (value.length > 1) {
      const orConstraints: string[] = [];
      for (const item of value as readonly string[]) {
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
          orConstraints.push(
            buildLikeOperatorStatement({
              model,
              propertyName,
              isNegated,
              value: item,
              params,
            }),
          );
        }
      }

      if (orConstraints.length === 1) {
        return orConstraints[0] ?? '';
      }

      if (isNegated) {
        return orConstraints.join(' AND ');
      }

      return `(${orConstraints.join(' OR ')})`;
    }

    // eslint-disable-next-line no-param-reassign
    value = value[0] as string | null;
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

      const columnType = (column as ColumnTypeMetadata).type?.toLowerCase();
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
