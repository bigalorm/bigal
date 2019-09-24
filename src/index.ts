import * as _ from 'lodash';
import { Pool } from 'postgres-pool';
import { ModelSchema } from './schema/ModelSchema';
import { Model } from './Model';
import { Repository } from './Repository';
import { ModelClassesByGlobalId } from './ModelClassesByGlobalId';
import { ModelSchemasByGlobalId } from './schema/ModelSchemasByGlobalId';
import { Entity } from './Entity';
import { ReadonlyRepository } from './ReadonlyRepository';
import { EntityMetadata } from './metadata/EntityMetadata';
import { ColumnMetadata } from './metadata/ColumnMetadata';
import { getMetadataStorage } from './metadata';

export interface Connection {
  pool: Pool;
  readonlyPool?: Pool;
}

export interface InitializeOptions extends Connection {
  entities: Array<new() => Entity>;
  connections?: { [index: string]: Connection };
  expose: (repository: Repository<Entity>, entityMetadata: EntityMetadata) => void;
}

/**
 * Initializes BigAl
 * @param {Object[]} modelSchemas - Model definitions
 * @param {Object} pool - Postgres Pool
 * @param {Object} [readonlyPool] - Postgres Pool for `find` and `findOne` operations. If not defined, `pool` will be used
 * @param {Object} [connections] - Key: name of the connection; Value: { pool, readonlyPool }
 * @param {function} expose - Used to expose model classes
 */
export function initialize({
                             pool,
                             readonlyPool = pool,
                             connections = {},
                             expose,
                           }: InitializeOptions) {
  const repositoriesByEntityName: { [index: string]: ReadonlyRepository } = {};
  const repositoriesByEntityNameLowered: { [index: string]: ReadonlyRepository } = {};
  const entitiesByName: { [index: string]: new() => Entity } = {};

  // Assemble all metadata for complete entity and column definitions
  const metadataByEntityName: { [index: string]: EntityMetadata } = {};
  const metadataStorage = getMetadataStorage();

  // Add dictionary to quickly find a column by propertyName, for applying ColumnModifierMetadata records
  const columnsByEntityName: { [index: string]: { columns: ColumnMetadata[], columnsByPropertyName: { [index: string]: ColumnMetadata } } } = {};
  for (const column of metadataStorage.columns) {
    columnsByEntityName[column.name] = columnsByEntityName[column.name] || {
      columns: [],
      columnsByPropertyName: {},
    };

    columnsByEntityName[column.name].columns.push(column);
    columnsByEntityName[column.name].columnsByPropertyName[column.propertyName] = column;
  }

  for (const columnModifier of metadataStorage.columnModifiers) {
    const entityColumns = columnsByEntityName[columnModifier.entity];
    if (!entityColumns) {
      throw new Error(`Please use @table() before using a column modifier like @primaryColumn, @createDateColumn, etc. Entity: ${columnModifier.entity}, Column: ${columnModifier.propertyName}`);
    }

    const column = entityColumns.columnsByPropertyName[columnModifier.propertyName];
    if (!column) {
      throw new Error(`Please use @column() before using a column modifier like @primaryColumn, @createDateColumn, etc. Entity: ${columnModifier.entity}, Column: ${columnModifier.propertyName}`);
    }

    Object.assign(column, columnModifier);
  }


  for (const entity of metadataStorage.entities) {
    const entityColumns = columnsByEntityName[entity.name];
    if (!entityColumns) {
      throw new Error(`Did not find any columns decorated with @column. Entity: ${entity.name}`);
    }

    entity.columns = entityColumns.columns;
    metadataByEntityName[entity.name] = entity;

    entitiesByNameLowered[entity.name.toLowerCase()] = entity.type;

    let entityPool = pool;
    let entityReadonlyPool = readonlyPool;

    if (entity.connection) {
      const entityConnection = connections[entity.connection];
      if (!entityConnection) {
        throw new Error(`Unable to find connection (${entity.connection}) for entity: ${entity.name}`);
      }

      entityPool = entityConnection.pool || pool;
      entityReadonlyPool = entityConnection.readonlyPool || entityPool;
    }

    let repository: ReadonlyRepository;
    if (entity.readonly) {
      repository = new ReadonlyRepository({
        entityMetadata: entity,
        type: entity.type,
        repositoriesByEntityName,
        repositoriesByEntityNameLowered,
        entitiesByNameLowered,
        pool: entityPool,
        readonlyPool: entityReadonlyPool,
      });

      repositoriesByEntityName[entity.name] = repository;
      repositoriesByEntityNameLowered[entity.name.toLowerCase()] = repository;
    } else {
      // TODO: Fill in Repository
    }

    expose(repository, entity);
  }
}
