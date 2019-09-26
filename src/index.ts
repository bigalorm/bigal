import _ from 'lodash';
import { Pool } from 'postgres-pool';
import { Repository } from './Repository';
import {Entity, EntityStatic} from './Entity';
import { ReadonlyRepository } from './ReadonlyRepository';
import {
  ColumnMetadata, ColumnTypeMetadata,
  getMetadataStorage,
  ModelMetadata,
} from './metadata';
import { RepositoriesByModelNameLowered } from './RepositoriesByModelNameLowered';

export * from './Entity';
export * from './ReadonlyRepository';
export * from './Repository';

export interface Connection {
  pool: Pool;
  readonlyPool?: Pool;
}

export interface InitializeOptions extends Connection {
  models: EntityStatic<Entity>[];
  connections?: { [index: string]: Connection };
  expose?: (repository: ReadonlyRepository<Entity> | Repository<Entity>, tableMetadata: ModelMetadata) => void;
}

/**
 * Initializes BigAl
 * @param {object[]} models - Model classes - used to force decorator evaluation for all models
 * @param {object[]} modelSchemas - Model definitions
 * @param {object} pool - Postgres Pool
 * @param {object} [readonlyPool] - Postgres Pool for `find` and `findOne` operations. If not defined, `pool` will be used
 * @param {object} [connections] - Key: name of the connection; Value: { pool, readonlyPool }
 * @param {Function} expose - Used to expose model classes
 */
export function initialize({
  models,
                             pool,
                             readonlyPool = pool,
                             connections = {},
                             expose,
                           }: InitializeOptions): RepositoriesByModelNameLowered {
  if (!models.length) {
    throw new Error('Models need to be specified to read all model information from decorators');
  }

  const repositoriesByModelNameLowered: RepositoriesByModelNameLowered = {};

  // Assemble all metadata for complete model and column definitions
  const metadataByModelName: { [index: string]: ModelMetadata } = {};
  const metadataStorage = getMetadataStorage();

  // Add dictionary to quickly find a column by propertyName, for applying ColumnModifierMetadata records
  const columnsByModelName: { [index: string]: { columns: ColumnMetadata[]; columnsByPropertyName: { [index: string]: ColumnMetadata } } } = {};
  for (const column of metadataStorage.columns) {
    columnsByModelName[column.target] = columnsByModelName[column.target] || {
      columns: [],
      columnsByPropertyName: {},
    };

    columnsByModelName[column.target].columns.push(column);
    columnsByModelName[column.target].columnsByPropertyName[column.propertyName] = column;
  }

  for (const columnModifier of metadataStorage.columnModifiers) {
    columnsByModelName[columnModifier.target] = columnsByModelName[columnModifier.target] || {
      columns: [],
      columnsByPropertyName: {},
    };

    const columns = columnsByModelName[columnModifier.target];

    const column = columns.columnsByPropertyName[columnModifier.propertyName];
    if (column) {
      Object.assign(column, _.omit(columnModifier, ['target', 'name', 'propertyName', 'type']));
    } else {
      if (!columnModifier.name) {
        throw new Error(`Missing column name `)
      }

      const columnModifierColumn = new ColumnTypeMetadata(columnModifier);
      columns.columns.push(columnModifierColumn);
      columns.columnsByPropertyName[columnModifierColumn.propertyName] = columnModifierColumn;
    }
  }


  for (const model of metadataStorage.models) {
    const entityColumns = columnsByModelName[model.name];
    if (!entityColumns) {
      throw new Error(`Did not find any columns decorated with @column. Entity: ${model.name}`);
    }

    model.columns = entityColumns.columns;
    metadataByModelName[model.name] = model;

    let modelPool = pool;
    let modelReadonlyPool = readonlyPool;

    if (model.connection) {
      const modelConnection = connections[model.connection];
      if (!modelConnection) {
        throw new Error(`Unable to find connection (${model.connection}) for entity: ${model.name}`);
      }

      modelPool = modelConnection.pool || pool;
      modelReadonlyPool = modelConnection.readonlyPool || modelPool;
    }

    let repository: ReadonlyRepository<Entity> | Repository<Entity>;
    if (model.readonly) {
      repository = new ReadonlyRepository({
        modelMetadata: model,
        type: model.type,
        repositoriesByModelNameLowered,
        pool: modelPool,
        readonlyPool: modelReadonlyPool,
      });

      repositoriesByModelNameLowered[model.name.toLowerCase()] = repository;
    } else {
      repository = new Repository({
        modelMetadata: model,
        type: model.type,
        repositoriesByModelNameLowered,
        pool: modelPool,
        readonlyPool: modelReadonlyPool,
      });

      repositoriesByModelNameLowered[model.name.toLowerCase()] = repository;
    }

    if (expose) {
      expose(repository, model);
    }
  }

  return repositoriesByModelNameLowered;
}
