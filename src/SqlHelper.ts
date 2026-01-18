import type { Entity, EntityFieldValue } from './Entity.js';
import { QueryError } from './errors/index.js';
import type { IReadonlyRepository } from './IReadonlyRepository.js';
import type { IRepository } from './IRepository.js';
import type { ColumnBaseMetadata, ColumnCollectionMetadata, ColumnModelMetadata, ColumnTypeMetadata, ModelMetadata } from './metadata/index.js';
import type { Comparer, JoinDefinition, ModelJoinDefinition, OrderBy, SubqueryJoinDefinition, WhereClauseValue, WhereQuery } from './query/index.js';
import { isSubqueryJoin } from './query/JoinDefinition.js';
import type { OnConflictOptions } from './query/OnConflictOptions.js';
import type { SelectAggregateExpression } from './query/SelectBuilder.js';
import type { HavingCondition, SubqueryBuilderLike } from './query/Subquery.js';
import { ScalarSubquery, SubqueryBuilder } from './query/Subquery.js';
import type { CreateUpdateParams, OmitEntityCollections, OmitFunctions } from './types/index.js';

interface QueryAndParams {
  query: string;
  params: readonly unknown[];
}

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
 * @param {JoinDefinition[]} [args.joins] - Array of join definitions
 * @param {boolean} [args.includeCount] - If true, includes COUNT(*) OVER() for total count
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
  joins,
  includeCount,
}: {
  repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;
  model: ModelMetadata<T>;
  select?: readonly (string & keyof OmitFunctions<OmitEntityCollections<T>>)[];
  where?: WhereQuery<T>;
  sorts: readonly OrderBy<T>[];
  skip: number;
  limit: number;
  joins?: readonly JoinDefinition[];
  includeCount?: boolean;
}): QueryAndParams {
  let query = 'SELECT ';

  query += getColumnsToSelect({
    model,
    select,
  });

  if (includeCount) {
    query += ',count(*) OVER() AS "__total_count__"';
  }

  query += ` FROM ${model.qualifiedTableName}`;

  const params: unknown[] = [];

  if (joins?.length) {
    query += buildJoinClauses({
      repositoriesByModelNameLowered,
      model,
      joins,
      params,
    });
  }

  const { whereStatement } = buildWhereStatement({
    repositoriesByModelNameLowered,
    model,
    where,
    params,
    joins,
  });

  if (whereStatement) {
    query += ` ${whereStatement}`;
  }

  const orderStatement = buildOrderStatement({
    repositoriesByModelNameLowered,
    model,
    sorts,
    joins,
  });

  if (orderStatement) {
    query += ` ${orderStatement}`;
  }

  if (limit) {
    if (typeof limit === 'string') {
      limit = Number(limit);
    }

    if (!Number.isFinite(limit)) {
      throw new QueryError('Limit should be a number', model, where);
    }

    query += ` LIMIT ${limit}`;
  }

  if (skip) {
    if (typeof skip === 'string') {
      skip = Number(skip);
    }

    if (!Number.isFinite(skip)) {
      throw new QueryError('Skip should be a number', model, where);
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
  let query = `SELECT count(*) AS "count" FROM ${model.qualifiedTableName}`;

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
 * @param {boolean} [args.returnRecords] - Determines if inserted records should be returned
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
  const entitiesToInsert = Array.isArray(values) ? values : [values];
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
      if (typeof defaultsTo === 'function') {
        defaultValue = defaultsTo();
      } else if (defaultsTo !== undefined) {
        defaultValue = defaultsTo;
      } else if (column.createDate) {
        defaultValue = new Date();
      } else if (column.updateDate) {
        defaultValue = new Date();
      } else if (column.version) {
        defaultValue = 1;
      }

      const hasDefaultValue = defaultValue !== undefined;
      let includePropertyName = false;
      for (const entity of entitiesToInsert) {
        // If there is a default value for the property and if it is not defined, use the default
        if (hasDefaultValue && entity[column.propertyName as string & keyof CreateUpdateParams<T>] === undefined) {
          // @ts-expect-error - string is not assignable to T[string & keyof T] | undefined
          entity[column.propertyName as string & keyof CreateUpdateParams<T>] = defaultValue;
        }

        if (entity[column.propertyName as string & keyof CreateUpdateParams<T>] === undefined) {
          if (column.required) {
            throw new QueryError(`Create statement for "${model.name}" is missing value for required field: ${column.propertyName}`, model);
          }
        } else {
          includePropertyName = true;

          // Check and enforce max length for applicable types
          const { maxLength, type } = column as ColumnTypeMetadata;

          if (maxLength && ['string', 'string[]'].includes(type)) {
            const entityValues = entity[column.propertyName as string & keyof CreateUpdateParams<T>] ?? '';
            const normalizedValues = (Array.isArray(entityValues) ? entityValues : [entityValues]) as string[];

            for (const normalizedValue of normalizedValues) {
              if (normalizedValue.length > maxLength) {
                throw new QueryError(`Create statement for "${model.name}" contains a value that exceeds maxLength on field: ${column.propertyName}`, model);
              }
            }
          }
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
  let query = `INSERT INTO ${model.qualifiedTableName} (`;
  for (const [columnIndex, column] of columnsToInsert.entries()) {
    if (columnIndex > 0) {
      query += ',';
    }

    query += `"${column.name}"`;

    for (const [entityIndex, entity] of entitiesToInsert.entries()) {
      let value;
      const entityValue = entity[column.propertyName as string & keyof CreateUpdateParams<T>] as EntityFieldValue;
      if (entityValue == null) {
        value = 'NULL';
      } else {
        const isJsonArray = (column as ColumnTypeMetadata).type === 'json' && Array.isArray(entityValue);
        const relatedModelName = (column as ColumnModelMetadata).model;
        if (relatedModelName && typeof entityValue === 'object') {
          const relatedModelRepository = repositoriesByModelNameLowered[relatedModelName.toLowerCase()];

          if (!relatedModelRepository) {
            throw new QueryError(`Unable to find model schema (${relatedModelName}) specified as model type for "${column.propertyName}" on "${model.name}"`, model);
          }

          const relatedModelPrimaryKey = relatedModelRepository.model.primaryKeyColumn;
          if (!relatedModelPrimaryKey) {
            throw new QueryError(`Unable to find primary key column for ${relatedModelName} when inserting ${model.name}.${column.propertyName} value.`, model);
          }

          const primaryKeyValue = (entityValue as Partial<T>)[relatedModelPrimaryKey.propertyName as string & keyof CreateUpdateParams<T> & keyof T] as EntityFieldValue;
          if (primaryKeyValue == null) {
            throw new QueryError(`Undefined primary key value for hydrated object value for "${column.propertyName}" on "${model.name}"`, model);
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
        throw new QueryError('Error trying to get insert values for entity index', model);
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
 * @param {boolean} [args.returnRecords] - Determines if inserted records should be returned
 * @param {string[]} [args.returnSelect] - Array of model property names to return from the query.
 * @returns {{query: string, params: object[]}}
 */
export function getUpdateQueryAndParams<T extends Entity>({
  repositoriesByModelNameLowered,
  model,
  where,
  values,
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
    if (values[column.propertyName as string & keyof CreateUpdateParams<T>] === undefined) {
      // @ts-expect-error - Date is not assignable to T[string & keyof T]
      values[column.propertyName as string & keyof CreateUpdateParams<T>] = new Date();
    }
  }

  const params = [];
  let query = `UPDATE ${model.qualifiedTableName} SET `;
  let isFirstProperty = true;
  for (const [propertyName, value] of Object.entries(values)) {
    const column = model.columnsByPropertyName[propertyName];
    if (column && !(column as ColumnCollectionMetadata).collection) {
      if (!isFirstProperty) {
        query += ',';
      }

      query += `"${column.name}"=`;
      if (value == null) {
        query += 'NULL';
      } else {
        const isJsonArray = (column as ColumnTypeMetadata).type === 'json' && Array.isArray(value);
        const relatedModelName = (column as ColumnModelMetadata).model;

        // Check and enforce max length for applicable types
        const { maxLength, type } = column as ColumnTypeMetadata;

        if (maxLength && ['string', 'string[]'].includes(type)) {
          const normalizedValues = (Array.isArray(value) ? value : [value]) as string[];

          for (const normalizedValue of normalizedValues) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (normalizedValue?.length > maxLength) {
              throw new QueryError(`Update statement for "${model.name}" contains a value that exceeds maxLength on field: ${column.propertyName}`, model);
            }
          }
        }

        if (relatedModelName && typeof value === 'object') {
          const relatedModelRepository = repositoriesByModelNameLowered[relatedModelName.toLowerCase()];

          if (!relatedModelRepository) {
            throw new QueryError(`Unable to find model schema (${relatedModelName}) specified as model type for "${propertyName}" on "${model.name}"`, model);
          }

          const relatedModelPrimaryKey = relatedModelRepository.model.primaryKeyColumn;
          if (!relatedModelPrimaryKey) {
            throw new QueryError(`Unable to find primary key column for ${relatedModelName} when inserting ${model.name}.${column.propertyName} value.`, model);
          }

          const primaryKeyValue = (value as Partial<T>)[relatedModelPrimaryKey.propertyName as string & keyof CreateUpdateParams<T> & keyof T] as EntityFieldValue;
          if (primaryKeyValue == null) {
            throw new QueryError(`Undefined primary key value for hydrated object value for "${column.propertyName}" on "${model.name}"`, model);
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
    if (values[column.propertyName as string & keyof CreateUpdateParams<T>] !== undefined) {
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
 * @param {boolean} [args.returnRecords] - Determines if inserted records should be returned
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
  let query = `DELETE FROM ${model.qualifiedTableName}`;

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
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
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
      throw new QueryError(`Unable to find column for property: ${propertyName} on ${model.tableName}`, model);
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
 * Builds SQL JOIN clauses for the specified join definitions
 * @param {object} args - Arguments
 * @param {object} args.repositoriesByModelNameLowered - All model schemas organized by model name
 * @param {object} args.model - Source model schema
 * @param {JoinDefinition[]} args.joins - Array of join definitions
 * @param {unknown[]} args.params - Array to collect query parameters
 * @returns {string} SQL join clauses
 */
export function buildJoinClauses<T extends Entity>({
  repositoriesByModelNameLowered,
  model,
  joins,
  params,
}: {
  repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;
  model: ModelMetadata<T>;
  joins: readonly JoinDefinition[];
  params: unknown[];
}): string {
  let joinSql = '';

  for (const join of joins) {
    if (isSubqueryJoin(join)) {
      joinSql += buildSubqueryJoinClause({
        model,
        join,
        params,
        repositoriesByModelNameLowered,
      });
    } else {
      joinSql += buildModelJoinClause({
        model,
        join,
        params,
        repositoriesByModelNameLowered,
      });
    }
  }

  return joinSql;
}

function buildModelJoinClause<T extends Entity>({
  model,
  join,
  params,
  repositoriesByModelNameLowered,
}: {
  model: ModelMetadata<T>;
  join: ModelJoinDefinition;
  params: unknown[];
  repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;
}): string {
  const column = model.columnsByPropertyName[join.propertyName] as ColumnModelMetadata | undefined;
  if (!column) {
    throw new QueryError(`Unable to find property "${join.propertyName}" on model "${model.name}" for join`, model);
  }

  if (!('model' in column) || !column.model) {
    throw new QueryError(`Property "${join.propertyName}" on model "${model.name}" is not a relationship and cannot be joined`, model);
  }

  const relatedRepository = repositoriesByModelNameLowered[column.model.toLowerCase()];
  if (!relatedRepository) {
    throw new QueryError(`Unable to find model "${column.model}" for join on "${join.propertyName}"`, model);
  }

  const relatedModel = relatedRepository.model;
  const relatedPrimaryKey = relatedModel.primaryKeyColumn;
  if (!relatedPrimaryKey) {
    throw new QueryError(`Unable to find primary key for model "${column.model}" when building join`, model);
  }

  const joinType = join.type === 'left' ? 'LEFT JOIN' : 'INNER JOIN';
  const alias = join.alias || join.propertyName;

  let joinSql = ` ${joinType} ${relatedModel.qualifiedTableName}`;

  if (alias !== relatedModel.tableName) {
    joinSql += ` AS "${alias}"`;
  }

  joinSql += ` ON ${model.qualifiedTableName}."${column.name}"="${alias}"."${relatedPrimaryKey.name}"`;

  if (join.on) {
    for (const [propertyName, value] of Object.entries(join.on)) {
      const onColumn = relatedModel.columnsByPropertyName[propertyName] as ColumnTypeMetadata | undefined;
      if (!onColumn) {
        throw new QueryError(`Unable to find property "${propertyName}" on model "${relatedModel.name}" for ON constraint`, relatedModel);
      }

      params.push(value);
      joinSql += ` AND "${alias}"."${onColumn.name}"=$${params.length}`;
    }
  }

  return joinSql;
}

function buildSubqueryJoinClause<T extends Entity>({
  model,
  join,
  params,
  repositoriesByModelNameLowered,
}: {
  model: ModelMetadata<T>;
  join: SubqueryJoinDefinition;
  params: unknown[];
  repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;
}): string {
  const subquerySQL = buildSubquerySelectSQL({
    subquery: join.subquery,
    params,
    repositoriesByModelNameLowered,
  });

  const joinType = join.type === 'left' ? 'LEFT JOIN' : 'INNER JOIN';

  const onConditions: string[] = [];
  for (const [mainColumn, subqueryColumn] of Object.entries(join.on)) {
    const column = model.columnsByPropertyName[mainColumn];
    if (!column) {
      throw new QueryError(`Unable to find property "${mainColumn}" on model "${model.name}" for subquery join`, model);
    }

    onConditions.push(`"${model.tableName}"."${column.name}"="${join.alias}"."${subqueryColumn}"`);
  }

  return ` ${joinType} (${subquerySQL}) AS "${join.alias}" ON ${onConditions.join(' AND ')}`;
}

function buildSubquerySelectSQL({
  subquery,
  params,
  repositoriesByModelNameLowered,
}: {
  subquery: SubqueryBuilderLike;
  params: unknown[];
  repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;
}): string {
  const repository = subquery._repository as IReadonlyRepository<Entity>;
  const subqueryModel = repository.model;
  const selectParts: string[] = [];

  if (subquery._select?.length) {
    for (const propertyName of subquery._select) {
      const column = subqueryModel.columnsByPropertyName[propertyName];
      if (!column) {
        throw new QueryError(`Unable to find column for property: ${propertyName} on ${subqueryModel.tableName}`, subqueryModel);
      }

      if (column.name === propertyName) {
        selectParts.push(`"${column.name}"`);
      } else {
        selectParts.push(`"${column.name}" AS "${propertyName}"`);
      }
    }
  }

  if (subquery._selectExpressions?.length) {
    for (const expr of subquery._selectExpressions) {
      selectParts.push(buildAggregateSQL(expr, subqueryModel));
    }
  }

  if (!selectParts.length) {
    throw new QueryError('Subquery join must have at least one selected column or expression', subqueryModel);
  }

  let sql = `SELECT ${selectParts.join(',')} FROM "${subqueryModel.tableName}"`;

  if (subquery._where && Object.keys(subquery._where as object).length) {
    const { whereStatement } = buildWhereStatement({
      repositoriesByModelNameLowered,
      model: subqueryModel,
      where: subquery._where as WhereQuery<Entity>,
      params,
    });

    if (whereStatement) {
      sql += ` ${whereStatement}`;
    }
  }

  if (subquery._groupBy?.length) {
    const groupColumns = subquery._groupBy.map((propertyName) => {
      const column = subqueryModel.columnsByPropertyName[propertyName];
      if (!column) {
        throw new QueryError(`Unable to find column for groupBy: ${propertyName}`, subqueryModel);
      }

      return `"${column.name}"`;
    });
    sql += ` GROUP BY ${groupColumns.join(',')}`;
  }

  if (subquery._having && subquery._selectExpressions?.length) {
    sql += buildHavingClause(subquery._having, subquery._selectExpressions, subqueryModel);
  }

  if (subquery._sort) {
    const sorts = convertSortToOrderBy(subquery._sort as Record<string, unknown> | string);
    const orderStatement = buildOrderStatement({
      repositoriesByModelNameLowered,
      model: subqueryModel,
      sorts,
    });

    if (orderStatement) {
      sql += ` ${orderStatement}`;
    }
  }

  // LIMIT
  if (subquery._limit) {
    sql += ` LIMIT ${subquery._limit}`;
  }

  return sql;
}

function buildAggregateSQL(expr: SelectAggregateExpression, model: ModelMetadata<Entity>): string {
  const sql = buildAggregateSQLWithoutAlias(expr, model);
  return `${sql} AS "${expr.alias}"`;
}

function buildAggregateSQLWithoutAlias(expr: SelectAggregateExpression, model: ModelMetadata<Entity>): string {
  if (expr.fn === 'count' && !expr.column) {
    return 'COUNT(*)';
  }

  if (expr.column) {
    const column = model.columnsByPropertyName[expr.column];
    if (!column) {
      throw new QueryError(`Unable to find column for aggregate: ${expr.column}`, model);
    }

    const colRef = `"${column.name}"`;
    const distinctPrefix = expr.distinct ? 'DISTINCT ' : '';
    return `${expr.fn.toUpperCase()}(${distinctPrefix}${colRef})`;
  }

  return `${expr.fn.toUpperCase()}(*)`;
}

const VALID_HAVING_OPERATORS = new Set(['<', '<=', '>', '>=', '!=']);

function buildHavingClause(having: HavingCondition, selectExpressions: SelectAggregateExpression[], model: ModelMetadata<Entity>): string {
  const conditions: string[] = [];

  for (const [alias, condition] of Object.entries(having)) {
    const expr = selectExpressions.find((expression) => expression.alias === alias);
    if (!expr) {
      throw new QueryError(`HAVING condition references unknown alias "${alias}". Make sure it matches an aggregate alias in select().`, model);
    }

    const aggregateSQL = buildAggregateSQLWithoutAlias(expr, model);

    if (typeof condition === 'number') {
      if (!Number.isFinite(condition)) {
        throw new QueryError(`HAVING condition value must be a finite number`, model);
      }

      conditions.push(`${aggregateSQL}=${condition}`);
    } else {
      const comparer = condition as Record<string, number>;
      for (const [operator, value] of Object.entries(comparer)) {
        if (!VALID_HAVING_OPERATORS.has(operator)) {
          throw new QueryError(`Invalid HAVING operator "${operator}". Valid operators are: <, <=, >, >=, !=`, model);
        }

        if (typeof value !== 'number' || !Number.isFinite(value)) {
          throw new QueryError(`HAVING condition value must be a finite number`, model);
        }

        if (operator === '!=') {
          conditions.push(`${aggregateSQL}<>${value}`);
        } else {
          conditions.push(`${aggregateSQL}${operator}${value}`);
        }
      }
    }
  }

  if (!conditions.length) {
    return '';
  }

  return ` HAVING ${conditions.join(' AND ')}`;
}

/**
 * Builds the SQL where statement based on the where expression
 * @param {object} args - Arguments
 * @param {object} args.repositoriesByModelNameLowered - All model schemas organized by global id
 * @param {object} args.model - Model schema
 * @param {object} [args.where]
 * @param {(number|string|object|null)[]} [args.params] - Objects to pass as parameters for the query
 * @param {JoinDefinition[]} [args.joins] - Array of join definitions for dot-notation support
 * @returns {object} {{whereStatement?: string, params: Array}}
 * @private
 */
export function buildWhereStatement<T extends Entity>({
  repositoriesByModelNameLowered,
  model,
  where,
  params = [],
  joins,
}: {
  repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;
  model: ModelMetadata<T>;
  where?: WhereQuery<T>;
  params?: unknown[];
  joins?: readonly JoinDefinition[];
}): {
  whereStatement?: string;
  params: unknown[];
} {
  let whereStatement;
  if (where && Object.keys(where).length) {
    whereStatement = buildWhere({
      repositoriesByModelNameLowered,
      model,
      comparer: 'and',
      value: where,
      params,
      joins,
    });

    if (!whereStatement) {
      throw new QueryError(`WHERE statement is unexpectedly empty.`, model, where);
    }
  }

  if (whereStatement) {
    whereStatement = `WHERE ${whereStatement}`;
  }

  return {
    whereStatement,
    params,
  };
}

export function buildOrderStatement<T extends Entity>({
  repositoriesByModelNameLowered,
  model,
  sorts,
  joins,
}: {
  repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;
  model: ModelMetadata<T>;
  sorts: readonly OrderBy<T>[];
  joins?: readonly JoinDefinition[];
}): string {
  if (!sorts.length) {
    return '';
  }

  let orderStatement = 'ORDER BY ';

  for (const [index, orderProperty] of sorts.entries()) {
    if (index > 0) {
      orderStatement += ',';
    }

    const { propertyName, descending } = orderProperty;

    const resolvedProperty = resolvePropertyPath({
      propertyPath: propertyName,
      model,
      joins,
      repositoriesByModelNameLowered,
    });

    if (resolvedProperty) {
      orderStatement += `"${resolvedProperty.tableAlias}"."${resolvedProperty.column.name}"`;
    } else {
      const column = model.columnsByPropertyName[propertyName];
      if (!column) {
        throw new QueryError(`Property (${propertyName}) not found in model (${model.name}).`, model);
      }

      orderStatement += `"${column.name}"`;
    }

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
 * @param {boolean} [args.isNegated] - If it is negated comparison
 * @param {object|string|number|boolean} [args.value] - Value to compare. Can also represent a complex where query
 * @param {object[]} args.params - Objects to pass as parameters for the query
 * @param {JoinDefinition[]} [args.joins] - Array of join definitions for dot-notation support
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
  params,
  joins,
}: {
  repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;
  model: ModelMetadata<T>;
  propertyName?: string;
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  comparer?: Comparer | string;
  isNegated?: boolean;
  value?: WhereClauseValue<string> | WhereClauseValue<T> | WhereQuery<T> | string | readonly WhereQuery<T>[];
  params: unknown[];
  joins?: readonly JoinDefinition[];
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
        joins,
      });
    case 'or':
      return buildOrOperatorStatement({
        repositoriesByModelNameLowered,
        model,
        isNegated,
        value: value as WhereQuery<T>[],
        params,
        joins,
      });
    case 'contains':
      if (Array.isArray(value)) {
        const values = (value as string[]).map((val) => {
          if (typeof val !== 'string') {
            throw new QueryError(`Expected all array values to be strings for "contains" constraint. Property (${propertyName ?? ''}) in model (${model.name}).`, model);
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
          joins,
        });
      }

      if (typeof value === 'string') {
        return buildWhere({
          repositoriesByModelNameLowered,
          model,
          propertyName,
          comparer: 'like',
          isNegated,
          value: `%${value}%`,
          params,
          joins,
        });
      }

      throw new QueryError(`Expected value to be a string for "contains" constraint. Property (${propertyName ?? ''}) in model (${model.name}).`, model);
    case 'startsWith':
      if (Array.isArray(value)) {
        const values = (value as string[]).map((val) => {
          if (typeof val !== 'string') {
            throw new QueryError(`Expected all array values to be strings for "startsWith" constraint. Property (${propertyName ?? ''}) in model (${model.name}).`, model);
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
          joins,
        });
      }

      if (typeof value === 'string') {
        return buildWhere({
          repositoriesByModelNameLowered,
          model,
          propertyName,
          comparer: 'like',
          isNegated,
          value: `${value}%`,
          params,
          joins,
        });
      }

      throw new QueryError(`Expected value to be a string for "startsWith" constraint. Property (${propertyName ?? ''}) in model (${model.name}).`, model);
    case 'endsWith':
      if (Array.isArray(value)) {
        const values = (value as string[]).map((val) => {
          if (typeof val !== 'string') {
            throw new QueryError(`Expected all array values to be strings for "endsWith" constraint. Property (${propertyName ?? ''}) in model (${model.name}).`, model);
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
          joins,
        });
      }

      if (typeof value === 'string') {
        return buildWhere({
          repositoriesByModelNameLowered,
          model,
          propertyName,
          comparer: 'like',
          isNegated,
          value: `%${value}`,
          params,
          joins,
        });
      }

      throw new QueryError(`Expected value to be a string for "endsWith" constraint. Property (${propertyName ?? ''}) in model (${model.name}).`, model);
    case 'like':
      return buildLikeOperatorStatement({
        repositoriesByModelNameLowered,
        model,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        propertyName: propertyName!,
        isNegated,
        value: value as LikeOperatorStatementParams<T>['value'],
        params,
        joins,
      });
    case 'in':
      if (value instanceof SubqueryBuilder) {
        if (!propertyName) {
          throw new QueryError(`Property name is required for 'in' operator with subquery`, model);
        }

        const column = model.columnsByPropertyName[propertyName];
        if (!column) {
          throw new QueryError(`Unable to find property ${propertyName} on model ${model.name}`, model);
        }

        const subquerySQL = buildSubquerySQL({
          subquery: value,
          params,
          repositoriesByModelNameLowered,
        });

        return `"${column.name}"${isNegated ? ' NOT' : ''} IN (${subquerySQL})`;
      }

      throw new QueryError(`Expected subquery value for 'in' operator. Property (${propertyName ?? ''}) in model (${model.name}).`, model);
    case 'exists':
      if (value instanceof SubqueryBuilder) {
        const subquerySQL = buildSubquerySQL({
          subquery: value,
          params,
          repositoriesByModelNameLowered,
        });

        return `${isNegated ? 'NOT ' : ''}EXISTS (${subquerySQL})`;
      }

      throw new QueryError(`Expected subquery value for 'exists' operator in model (${model.name}).`, model);
    default: {
      // Handle 'and' with array value (explicit and: [...] in where clause)
      // When value is not an array, this is the internal call from buildWhereStatement and should continue to default processing
      if (comparer === 'and' && Array.isArray(value)) {
        return buildAndOperatorStatement({
          repositoriesByModelNameLowered,
          model,
          isNegated,
          value: value as WhereQuery<T>[],
          params,
          joins,
        });
      }

      if (value === undefined) {
        throw new QueryError(`Attempting to query with an undefined value. ${propertyName ?? ''} on ${model.name}`, model);
      }

      if (propertyName) {
        const column = model.columnsByPropertyName[propertyName] as ColumnModelMetadata;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (column && typeof value === 'object' && value !== null) {
          if (column.primary) {
            const primaryKeyValue = (value as unknown as Partial<T>)[column.propertyName as string & keyof T];
            if (primaryKeyValue != null) {
              // Treat `value` as a hydrated object
              return buildWhere({
                repositoriesByModelNameLowered,
                model,
                propertyName,
                comparer,
                isNegated,
                value: primaryKeyValue as WhereClauseValue<T>,
                params,
                joins,
              });
            }
          } else if (column.model) {
            const relatedModelRepository = repositoriesByModelNameLowered[column.model.toLowerCase()];

            if (!relatedModelRepository) {
              throw new QueryError(`Unable to find model schema (${column.model}) specified in where clause for "${column.propertyName}"`, model);
            }

            const relatedModelPrimaryKey = relatedModelRepository.model.primaryKeyColumn;
            if (!relatedModelPrimaryKey) {
              throw new QueryError(`Unable to find primary key column for ${column.model} specified in where clause for ${model.name}.${column.propertyName}`, model);
            }

            const primaryKeyValue = (value as unknown as Partial<T>)[relatedModelPrimaryKey.propertyName as string & keyof T];
            if (primaryKeyValue != null) {
              // Treat `value` as a hydrated object
              return buildWhere({
                repositoriesByModelNameLowered,
                model,
                propertyName,
                comparer,
                isNegated,
                value: primaryKeyValue as WhereClauseValue<T>,
                params,
                joins,
              });
            }
          }
        }
      }

      if (Array.isArray(value)) {
        if (!value.length) {
          const columnTypeFromPropertyName = propertyName ? (model.columnsByPropertyName[propertyName] as ColumnTypeMetadata) : null;
          const columnTypeFromComparer = comparer ? (model.columnsByPropertyName[comparer] as ColumnTypeMetadata) : null;
          const arrayColumn = columnTypeFromPropertyName ?? columnTypeFromComparer;

          if (arrayColumn) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
          if (item === null) {
            orConstraints.push(
              buildWhere({
                repositoriesByModelNameLowered,
                model,
                propertyName,
                isNegated,
                value: null,
                params,
                joins,
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
                joins,
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
              joins,
            }),
          );
        } else if (valueWithoutNull.length) {
          const columnTypeFromPropertyName = propertyName ? (model.columnsByPropertyName[propertyName] as ColumnTypeMetadata) : null;
          const columnTypeFromComparer = comparer ? (model.columnsByPropertyName[comparer] as ColumnTypeMetadata) : null;
          const columnType = columnTypeFromPropertyName ?? columnTypeFromComparer;

          if (columnType) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
                    joins,
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
                    throw new QueryError(`Unable to find model schema (${columnAsModelType.model}) specified in where clause for "${columnAsModelType.propertyName}"`, model);
                  }

                  const relatedModelPrimaryKey = relatedModelRepository.model.primaryKeyColumn as ColumnTypeMetadata;
                  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                  if (!relatedModelPrimaryKey) {
                    throw new QueryError(`Unable to find primary key column for ${columnAsModelType.model} specified in where clause for ${model.name}.${columnAsModelType.propertyName}`, model);
                  }

                  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
                case 'uuid':
                case 'uuid[]':
                  castType = '::UUID[]';
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

        if (orConstraints.length) {
          return `(${orConstraints.join(' OR ')})`;
        }

        return '';
      }

      if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
        if (value instanceof ScalarSubquery) {
          return buildComparisonOperatorStatement({
            repositoriesByModelNameLowered,
            model,
            propertyName: propertyName ?? comparer ?? '',
            comparer,
            isNegated,
            value: value as unknown as WhereClauseValue<T>,
            params,
            joins,
          });
        }

        const andValues: string[] = [];
        for (const [key, where] of Object.entries(value)) {
          if (typeof where === 'object' && where !== null && !Array.isArray(where) && !(where instanceof Date)) {
            const resolvedJoin = resolveJoinAlias({
              aliasOrPropertyName: key,
              model,
              joins,
              repositoriesByModelNameLowered,
            });

            if (resolvedJoin) {
              const nestedClause = buildNestedJoinWhere({
                repositoriesByModelNameLowered,
                joinedModel: resolvedJoin.joinedModel,
                tableAlias: resolvedJoin.tableAlias,
                nestedWhere: where as Record<string, unknown>,
                params,
              });

              if (nestedClause) {
                andValues.push(nestedClause);
              }

              continue;
            }
          }

          // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
          let subQueryComparer: Comparer | string | undefined;
          if (isComparer(key)) {
            subQueryComparer = key;
          } else {
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
              joins,
            }),
          );
        }

        return andValues.join(' AND ');
      }

      return buildComparisonOperatorStatement({
        repositoriesByModelNameLowered,
        model,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        propertyName: propertyName!,
        comparer,
        isNegated,
        value: value as WhereClauseValue<T>,
        params,
        joins,
      });
    }
  }
}

function buildOrOperatorStatement<T extends Entity>({
  repositoriesByModelNameLowered,
  model,
  isNegated,
  value,
  params,
  joins,
}: {
  repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;
  model: ModelMetadata<T>;
  isNegated: boolean;
  value: readonly WhereQuery<T>[];
  params: unknown[];
  joins?: readonly JoinDefinition[];
}): string {
  const orClauses = [];
  for (const constraint of value) {
    const orClause = buildWhere({
      repositoriesByModelNameLowered,
      model,
      isNegated,
      value: constraint,
      params,
      joins,
    });

    if (orClause) {
      orClauses.push(`(${orClause})`);
    }
  }

  if (orClauses.length === 1) {
    return orClauses[0] ?? '';
  }

  if (isNegated) {
    return orClauses.join(' AND ');
  }

  if (orClauses.length) {
    return `(${orClauses.join(' OR ')})`;
  }

  return '';
}

function buildAndOperatorStatement<T extends Entity>({
  repositoriesByModelNameLowered,
  model,
  isNegated,
  value,
  params,
  joins,
}: {
  repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;
  model: ModelMetadata<T>;
  isNegated: boolean;
  value: readonly WhereQuery<T>[];
  params: unknown[];
  joins?: readonly JoinDefinition[];
}): string {
  const andClauses = [];
  for (const constraint of value) {
    const andClause = buildWhere({
      repositoriesByModelNameLowered,
      model,
      isNegated,
      value: constraint,
      params,
      joins,
    });

    if (andClause) {
      andClauses.push(`(${andClause})`);
    }
  }

  if (andClauses.length === 1) {
    return andClauses[0] ?? '';
  }

  if (isNegated) {
    return andClauses.join(' OR ');
  }

  if (andClauses.length) {
    return `(${andClauses.join(' AND ')})`;
  }

  return '';
}

interface ComparisonOperatorStatementParams<T extends Entity> {
  repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;
  model: ModelMetadata<T>;
  propertyName: string;
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  comparer?: Comparer | string;
  isNegated: boolean;
  value?: WhereClauseValue<T> | string | readonly string[];
  params: unknown[];
  joins?: readonly JoinDefinition[];
}

interface LikeOperatorStatementParams<T extends Entity> extends Omit<ComparisonOperatorStatementParams<T>, 'value'> {
  value: string | readonly string[] | null;
}

interface ResolvedProperty {
  column: ColumnBaseMetadata;
  tableAlias: string;
}

function resolvePropertyPath<T extends Entity>({
  propertyPath,
  model,
  joins,
  repositoriesByModelNameLowered,
}: {
  propertyPath: string;
  model: ModelMetadata<T>;
  joins?: readonly JoinDefinition[];
  repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;
}): ResolvedProperty | null {
  if (!propertyPath.includes('.')) {
    return null;
  }

  const dotIndex = propertyPath.indexOf('.');
  const aliasOrRelationship = propertyPath.slice(0, dotIndex);
  const nestedPropertyName = propertyPath.slice(dotIndex + 1);

  if (!joins?.length) {
    throw new QueryError(`Cannot use dot notation "${propertyPath}" without a join. Did you forget to call .join('${aliasOrRelationship}')?`, model);
  }

  const matchingJoin = joins.find((join) => join.alias === aliasOrRelationship || (!isSubqueryJoin(join) && join.propertyName === aliasOrRelationship));
  if (!matchingJoin) {
    throw new QueryError(`Cannot find join for "${aliasOrRelationship}" in property path "${propertyPath}". Available joins: ${joins.map((join) => join.alias).join(', ')}`, model);
  }

  // For subquery joins, the nestedPropertyName refers to a column alias in the subquery
  if (isSubqueryJoin(matchingJoin)) {
    // Return a minimal column metadata for the subquery column (which is an alias, not a real column)
    return {
      column: { name: nestedPropertyName, propertyName: nestedPropertyName } as ColumnBaseMetadata,
      tableAlias: matchingJoin.alias,
    };
  }

  const relationshipColumn = model.columnsByPropertyName[matchingJoin.propertyName] as ColumnModelMetadata | undefined;
  if (!relationshipColumn?.model) {
    throw new QueryError(`Property "${matchingJoin.propertyName}" is not a relationship on model "${model.name}"`, model);
  }

  const relatedRepository = repositoriesByModelNameLowered[relationshipColumn.model.toLowerCase()];
  if (!relatedRepository) {
    throw new QueryError(`Unable to find model "${relationshipColumn.model}" for join on "${matchingJoin.propertyName}"`, model);
  }

  const relatedModel = relatedRepository.model;
  const column = relatedModel.columnsByPropertyName[nestedPropertyName];
  if (!column) {
    throw new QueryError(`Unable to find property "${nestedPropertyName}" on model "${relatedModel.name}" for path "${propertyPath}"`, relatedModel);
  }

  return {
    column,
    tableAlias: matchingJoin.alias,
  };
}

interface ResolvedJoin {
  joinedModel: ModelMetadata<Entity>;
  tableAlias: string;
}

function resolveJoinAlias<T extends Entity>({
  aliasOrPropertyName,
  model,
  joins,
  repositoriesByModelNameLowered,
}: {
  aliasOrPropertyName: string;
  model: ModelMetadata<T>;
  joins?: readonly JoinDefinition[];
  repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;
}): ResolvedJoin | null {
  if (!joins?.length) {
    return null;
  }

  const matchingJoin = joins.find((join) => join.alias === aliasOrPropertyName || (!isSubqueryJoin(join) && join.propertyName === aliasOrPropertyName));
  if (!matchingJoin) {
    return null;
  }

  // Subquery joins don't have a related model in the same way
  if (isSubqueryJoin(matchingJoin)) {
    return null;
  }

  const relationshipColumn = model.columnsByPropertyName[matchingJoin.propertyName] as ColumnModelMetadata | undefined;
  if (!relationshipColumn?.model) {
    return null;
  }

  const relatedRepository = repositoriesByModelNameLowered[relationshipColumn.model.toLowerCase()];
  if (!relatedRepository) {
    return null;
  }

  return {
    joinedModel: relatedRepository.model,
    tableAlias: matchingJoin.alias,
  };
}

function buildNestedJoinWhere({
  repositoriesByModelNameLowered,
  joinedModel,
  tableAlias,
  nestedWhere,
  params,
}: {
  repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;
  joinedModel: ModelMetadata<Entity>;
  tableAlias: string;
  nestedWhere: Record<string, unknown>;
  params: unknown[];
}): string {
  const andClauses: string[] = [];

  for (const [key, whereValue] of Object.entries(nestedWhere)) {
    if (key === 'and' || key === 'or') {
      const subClauses = (whereValue as Record<string, unknown>[]).map((subWhere) =>
        buildNestedJoinWhere({
          repositoriesByModelNameLowered,
          joinedModel,
          tableAlias,
          nestedWhere: subWhere,
          params,
        }),
      );

      if (key === 'or') {
        andClauses.push(`(${subClauses.join(' OR ')})`);
      } else {
        andClauses.push(subClauses.join(' AND '));
      }

      continue;
    }

    const column = joinedModel.columnsByPropertyName[key];
    if (!column) {
      throw new QueryError(`Unable to find property "${key}" on joined model "${joinedModel.name}"`, joinedModel);
    }

    if (whereValue === null) {
      andClauses.push(`"${tableAlias}"."${column.name}" IS NULL`);
    } else if (typeof whereValue === 'object' && !Array.isArray(whereValue)) {
      for (const [op, opValue] of Object.entries(whereValue as Record<string, unknown>)) {
        if (op === '!') {
          if (opValue === null) {
            andClauses.push(`"${tableAlias}"."${column.name}" IS NOT NULL`);
          } else {
            params.push(opValue);
            andClauses.push(`"${tableAlias}"."${column.name}"<>$${params.length}`);
          }
        } else if (op === 'like' || op === 'contains' || op === 'startsWith' || op === 'endsWith') {
          let likeValue = opValue as string;
          if (op === 'contains') {
            likeValue = `%${likeValue}%`;
          } else if (op === 'startsWith') {
            likeValue = `${likeValue}%`;
          } else if (op === 'endsWith') {
            likeValue = `%${likeValue}`;
          }

          params.push(likeValue);
          andClauses.push(`"${tableAlias}"."${column.name}" ILIKE $${params.length}`);
        } else if (op === '>' || op === '>=' || op === '<' || op === '<=') {
          params.push(opValue);
          andClauses.push(`"${tableAlias}"."${column.name}"${op}$${params.length}`);
        }
      }
    } else if (Array.isArray(whereValue)) {
      if (whereValue.length === 0) {
        andClauses.push('1<>1');
      } else {
        params.push(whereValue);
        andClauses.push(`"${tableAlias}"."${column.name}"=ANY($${params.length})`);
      }
    } else {
      params.push(whereValue);
      andClauses.push(`"${tableAlias}"."${column.name}"=$${params.length}`);
    }
  }

  return andClauses.join(' AND ');
}

function buildLikeOperatorStatement<T extends Entity>({ repositoriesByModelNameLowered, model, propertyName, isNegated, value, params, joins }: LikeOperatorStatementParams<T>): string {
  if (Array.isArray(value)) {
    if (!value.length) {
      if (isNegated) {
        return '1=1';
      }

      return '1<>1';
    }

    if (value.length > 1) {
      const orConstraints: string[] = [];
      for (const item of value as readonly string[]) {
        orConstraints.push(
          buildLikeOperatorStatement({
            repositoriesByModelNameLowered,
            model,
            propertyName,
            isNegated,
            value: item,
            params,
            joins,
          }),
        );
      }

      if (orConstraints.length === 1) {
        return orConstraints[0] ?? '';
      }

      if (isNegated) {
        return orConstraints.join(' AND ');
      }

      if (orConstraints.length) {
        return `(${orConstraints.join(' OR ')})`;
      }

      return '';
    }

    value = value[0] as string | null;
  }

  const resolved = resolvePropertyPath({
    propertyPath: propertyName,
    model,
    joins,
    repositoriesByModelNameLowered,
  });

  let column: ColumnBaseMetadata;
  let tablePrefix: string;

  if (resolved) {
    column = resolved.column;
    tablePrefix = `"${resolved.tableAlias}".`;
  } else {
    const localColumn = model.columnsByPropertyName[propertyName];
    if (!localColumn) {
      throw new QueryError(`Unable to find property ${propertyName} on model ${model.name}`, model);
    }

    column = localColumn;
    tablePrefix = '';
  }

  if (value === null) {
    return `${tablePrefix}"${column.name}" ${isNegated ? 'IS NOT' : 'IS'} NULL`;
  }

  if (typeof value === 'string') {
    if (value) {
      // NOTE: This is doing a case-insensitive pattern match
      params.push(value);

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      const columnType = (column as ColumnTypeMetadata).type?.toLowerCase();
      if (columnType === 'array' || columnType === 'string[]') {
        return `${isNegated ? 'NOT ' : ''}EXISTS(SELECT 1 FROM (SELECT unnest(${tablePrefix}"${column.name}") AS "unnested_${column.name}") __unnested WHERE "unnested_${column.name}" ILIKE $${params.length})`;
      }

      return `${tablePrefix}"${column.name}"${isNegated ? ' NOT' : ''} ILIKE $${params.length}`;
    }

    return `${tablePrefix}"${column.name}" ${isNegated ? '!=' : '='} ''`;
  }

  throw new QueryError(`Expected value to be a string for "like" constraint. Property (${propertyName}) in model (${model.name}).`, model);
}

function buildComparisonOperatorStatement<T extends Entity>({
  repositoriesByModelNameLowered,
  model,
  propertyName,
  comparer,
  isNegated,
  value,
  params,
  joins,
}: ComparisonOperatorStatementParams<T>): string {
  const resolved = resolvePropertyPath({
    propertyPath: propertyName,
    model,
    joins,
    repositoriesByModelNameLowered,
  });

  let column: ColumnBaseMetadata;
  let tablePrefix: string;

  if (resolved) {
    column = resolved.column;
    tablePrefix = `"${resolved.tableAlias}".`;
  } else {
    const localColumn = model.columnsByPropertyName[propertyName];
    if (!localColumn) {
      throw new QueryError(`Unable to find property ${propertyName} on model ${model.name}`, model);
    }

    column = localColumn;
    tablePrefix = '';
  }

  if (value === null) {
    return `${tablePrefix}"${column.name}" ${isNegated ? 'IS NOT' : 'IS'} NULL`;
  }

  if (value instanceof ScalarSubquery) {
    const scalarSQL = buildScalarSubquerySQL({
      scalarSubquery: value,
      params,
      repositoriesByModelNameLowered,
    });

    switch (comparer) {
      case '<':
        return `${tablePrefix}"${column.name}"${isNegated ? '>=' : '<'}(${scalarSQL})`;
      case '<=':
        return `${tablePrefix}"${column.name}"${isNegated ? '>' : '<='}(${scalarSQL})`;
      case '>':
        return `${tablePrefix}"${column.name}"${isNegated ? '<=' : '>'}(${scalarSQL})`;
      case '>=':
        return `${tablePrefix}"${column.name}"${isNegated ? '<' : '>='}(${scalarSQL})`;
      default:
        return `${tablePrefix}"${column.name}"${isNegated ? '<>' : '='}(${scalarSQL})`;
    }
  }

  params.push(value);

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const columnType = (column as ColumnTypeMetadata).type ?? 'unknown';
  const supportsLessThanGreaterThan = columnType !== 'array' && columnType !== 'json';

  switch (comparer) {
    case '<':
      if (!supportsLessThanGreaterThan) {
        throw new QueryError(`< operator is not supported for ${columnType} type. ${propertyName || ''} on ${model.name}`, model);
      }

      return `${tablePrefix}"${column.name}"${isNegated ? '>=' : '<'}$${params.length}`;
    case '<=':
      if (!supportsLessThanGreaterThan) {
        throw new QueryError(`<= operator is not supported for ${columnType} type. ${propertyName || ''} on ${model.name}`, model);
      }

      return `${tablePrefix}"${column.name}"${isNegated ? '>' : '<='}$${params.length}`;
    case '>':
      if (!supportsLessThanGreaterThan) {
        throw new QueryError(`> operator is not supported for ${columnType} type. ${propertyName || ''} on ${model.name}`, model);
      }

      return `${tablePrefix}"${column.name}"${isNegated ? '<=' : '>'}$${params.length}`;
    case '>=':
      if (!supportsLessThanGreaterThan) {
        throw new QueryError(`>= operator is not supported for ${columnType} type. ${propertyName || ''} on ${model.name}`, model);
      }

      return `${tablePrefix}"${column.name}"${isNegated ? '<' : '>='}$${params.length}`;
    default:
      if (columnType === 'array' || columnType.endsWith('[]')) {
        return `$${params.length}${isNegated ? '<>ALL(' : '=ANY('}${tablePrefix}"${column.name}")`;
      }

      return `${tablePrefix}"${column.name}"${isNegated ? '<>' : '='}$${params.length}`;
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
    case 'in':
    case 'exists':
      return true;
    default:
      return false;
  }
}

export function buildSubquerySQL<T extends Entity>({
  subquery,
  params,
  repositoriesByModelNameLowered,
}: {
  subquery: SubqueryBuilder<T>;
  params: unknown[];
  repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;
}): string {
  const model = subquery._repository.model;

  let sql = 'SELECT ';

  if (subquery._select?.length) {
    sql += subquery._select
      .map((propertyName) => {
        const column = model.columnsByPropertyName[propertyName];
        if (!column) {
          throw new QueryError(`Unable to find column for property: ${propertyName} on ${model.tableName}`, model);
        }

        return `"${column.name}"`;
      })
      .join(',');
  } else {
    sql += '1';
  }

  sql += ` FROM ${model.qualifiedTableName}`;

  if (subquery._where && Object.keys(subquery._where).length) {
    const { whereStatement } = buildWhereStatement({
      repositoriesByModelNameLowered,
      model,
      where: subquery._where,
      params,
    });

    if (whereStatement) {
      sql += ` ${whereStatement}`;
    }
  }

  if (subquery._sort) {
    const sorts = convertSortToOrderBy(subquery._sort);
    const orderStatement = buildOrderStatement({
      repositoriesByModelNameLowered,
      model,
      sorts,
    });

    if (orderStatement) {
      sql += ` ${orderStatement}`;
    }
  }

  if (subquery._limit) {
    sql += ` LIMIT ${subquery._limit}`;
  }

  return sql;
}

export function buildScalarSubquerySQL({
  scalarSubquery,
  params,
  repositoriesByModelNameLowered,
}: {
  scalarSubquery: ScalarSubquery<unknown>;
  params: unknown[];
  repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>>;
}): string {
  const subquery = scalarSubquery._subquery;
  const model = subquery._repository.model;

  let aggregateSQL: string;
  if (scalarSubquery._aggregate === 'count') {
    aggregateSQL = 'COUNT(*)';
  } else {
    if (!scalarSubquery._aggregateColumn) {
      throw new QueryError(`Aggregate ${scalarSubquery._aggregate} requires a column`, model);
    }

    const column = model.columnsByPropertyName[scalarSubquery._aggregateColumn];
    if (!column) {
      throw new QueryError(`Unable to find column for property: ${scalarSubquery._aggregateColumn} on ${model.tableName}`, model);
    }

    const aggregateFn = scalarSubquery._aggregate.toUpperCase();
    aggregateSQL = `${aggregateFn}("${column.name}")`;
  }

  let sql = `SELECT ${aggregateSQL} FROM ${model.qualifiedTableName}`;

  if (subquery._where && Object.keys(subquery._where).length) {
    const { whereStatement } = buildWhereStatement({
      repositoriesByModelNameLowered,
      model,
      where: subquery._where,
      params,
    });

    if (whereStatement) {
      sql += ` ${whereStatement}`;
    }
  }

  return sql;
}

function convertSortToOrderBy<T extends Entity>(sort: Record<string, unknown> | string): OrderBy<T>[] {
  const result: OrderBy<T>[] = [];

  if (typeof sort === 'string') {
    for (const sortPart of sort.split(',')) {
      const parts = sortPart.trim().split(' ');
      const propertyName = parts.shift() as string & keyof OmitFunctions<OmitEntityCollections<T>>;
      result.push({
        propertyName,
        descending: /desc/i.test(parts.join('')),
      });
    }
  } else if (typeof sort === 'object') {
    for (const [propertyName, orderValue] of Object.entries(sort)) {
      let descending = false;
      if (orderValue && (orderValue === -1 || (typeof orderValue === 'string' && /desc/i.test(orderValue)))) {
        descending = true;
      }

      result.push({
        propertyName: propertyName as string & keyof OmitFunctions<OmitEntityCollections<T>>,
        descending,
      });
    }
  }

  return result;
}
