import _ from 'lodash';
import { Pool } from 'postgres-pool';
import { Repository } from './Repository';
import { Entity, EntityStatic } from './Entity';
import { ReadonlyRepository } from './ReadonlyRepository';
import {
  ColumnMetadata,
  ColumnModelMetadata,
  ColumnModifierMetadata,
  ColumnTypeMetadata,
  getMetadataStorage,
  ModelMetadata,
} from './metadata';
import { RepositoriesByModelName } from './RepositoriesByModelName';
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

// This will build an inverted array of inherited classes ([grandparent, parent, item])
function getInheritanceTree(model: Function): Function[] {
  const tree = [model];
  function getRecursivePrototypesOf(parentEntity: Function): void {
    const proto = Object.getPrototypeOf(parentEntity);
    if (proto && proto.name && proto.name !== 'Function') {
      tree.unshift(proto);
      getRecursivePrototypesOf(proto);
    }
  }

  getRecursivePrototypesOf(model);

  return tree;
}

/**
 * Initializes BigAl
 * @param {object[]} models - Model classes - used to force decorator evaluation for all models
 * @param {object[]} modelSchemas - Model definitions
 * @param {object} pool - Postgres Pool
 * @param {object} [readonlyPool] - Postgres Pool for `find` and `findOne` operations. If not defined, `pool` will be used
 * @param {object} [connections] - Key: name of the connection; Value: { pool, readonlyPool }
 * @param {Function} [expose] - Used to expose model classes
 * @returns {object} Repositories by model name
 */
export function initialize({
                             models,
                             pool,
                             readonlyPool = pool,
                             connections = {},
                             expose,
                           }: InitializeOptions): RepositoriesByModelName {
  if (!models.length) {
    throw new Error('Models need to be specified to read all model information from decorators');
  }

  const inheritanceTreesByModelName: { [index: string]: Function[] } = {};
  const modelNames: string[] = [];
  for (const model of models) {
    // Load inheritance hierarchy for each model. This will make sure that any decorators on inherited class files are
    // added to metadata storage
    inheritanceTreesByModelName[model.name] = getInheritanceTree(model);
    modelNames.push(model.name);
  }

  // Assemble all metadata for complete model and column definitions
  const metadataStorage = getMetadataStorage();

  const modelMetadataByModelName: { [index: string]: ModelMetadata } = {};
  for (const model of metadataStorage.models) {
    modelMetadataByModelName[model.name] = model;
  }

  interface ColumnsByPropertyName { [index: string]: ColumnMetadata }
  // Add dictionary to quickly find a column by propertyName, for applying ColumnModifierMetadata records
  const columnsByPropertyNameForModel: { [index: string]: ColumnsByPropertyName } = {};
  for (const column of metadataStorage.columns) {
    columnsByPropertyNameForModel[column.target] = columnsByPropertyNameForModel[column.target] || {};
    columnsByPropertyNameForModel[column.target][column.propertyName] = column;
  }

  interface ColumnModifiersByPropertyName { [index: string]: ColumnModifierMetadata[] }
  const columnModifiersByPropertyNameForModel: { [index: string]: ColumnModifiersByPropertyName } = {};
  for (const columnModifier of metadataStorage.columnModifiers) {
    columnModifiersByPropertyNameForModel[columnModifier.target] = columnModifiersByPropertyNameForModel[columnModifier.target] || {};
    columnModifiersByPropertyNameForModel[columnModifier.target][columnModifier.propertyName] = columnModifiersByPropertyNameForModel[columnModifier.target][columnModifier.propertyName] || [];
    columnModifiersByPropertyNameForModel[columnModifier.target][columnModifier.propertyName].push(columnModifier);
  }

  // Aggregate columns from inherited classes
  // NOTE: Inherited @columns will be replaced if found on a child class. Column modifiers, however, are additive.
  // @column found on a child class will remove any previous modifier
  for (const model of models) {
    let modelMetadata: ModelMetadata | undefined;
    let inheritedColumnsByPropertyName: ColumnsByPropertyName = {};
    const inheritedColumnModifiersByPropertyName: ColumnModifiersByPropertyName = {};
    for (const inheritedClass of inheritanceTreesByModelName[model.name]) {
      modelMetadata = modelMetadataByModelName[inheritedClass.name] || modelMetadata;
      const columnsByPropertyName = columnsByPropertyNameForModel[inheritedClass.name] || {};

      inheritedColumnsByPropertyName = {
        ...inheritedColumnsByPropertyName,
        ...columnsByPropertyName,
      };

      // Remove any previously defined column modifiers for this property since a new @column was found
      for (const [propertyName] of Object.entries(columnsByPropertyName)) {
        delete inheritedColumnModifiersByPropertyName[propertyName];
      }

      const columnModifiersByPropertyName = columnModifiersByPropertyNameForModel[inheritedClass.name] || {};
      for (const [propertyName, columnModifiers] of Object.entries(columnModifiersByPropertyName)) {
        inheritedColumnModifiersByPropertyName[propertyName] = [
          ...(inheritedColumnModifiersByPropertyName[propertyName] || []),
          ...(columnModifiers || []),
        ];
      }
    }

    if (!modelMetadata) {
      throw new Error(`Unable to find @table() on ${model.name}`);
    }

    modelMetadataByModelName[model.name] = new ModelMetadata({
      ...modelMetadata,
      name: model.name,
      type: model,
    });
    columnsByPropertyNameForModel[model.name] = inheritedColumnsByPropertyName;
    columnModifiersByPropertyNameForModel[model.name] = inheritedColumnModifiersByPropertyName;
  }

  // Process all column modifiers to augment any @column definitions
  for (const [modelName, columnModifiersByPropertyName] of Object.entries(columnModifiersByPropertyNameForModel)) {
    columnsByPropertyNameForModel[modelName] = columnsByPropertyNameForModel[modelName] || {};
    for (const [propertyName, columnModifiers] of Object.entries(columnModifiersByPropertyName)) {
      const column = columnsByPropertyNameForModel[modelName][propertyName];
      if (column) {
        for (const columnModifier of columnModifiers) {
          Object.assign(column, _.omit(columnModifier, ['target', 'name', 'propertyName', 'type', 'model']));
        }
      } else {
        let columnDetails: ColumnModifierMetadata = {
          target: modelName,
          propertyName,
        };
        for (const columnModifier of columnModifiers) {
          columnDetails = {
            ...columnDetails,
            ...columnModifier,
          };
        }

        if (!columnDetails.name) {
          throw new Error(`Missing column name for ${modelName}#${propertyName}`);
        }

        if (!columnDetails.type && !columnDetails.model) {
          throw new Error(`Missing column type for ${modelName}#${propertyName}`);
        }

        if (columnDetails.model) {
          columnsByPropertyNameForModel[modelName][propertyName] = new ColumnModelMetadata({
            ...columnDetails,
            name: columnDetails.name,
            model: columnDetails.model,
          });
        } else if (columnDetails.type) {
          columnsByPropertyNameForModel[modelName][propertyName] = new ColumnTypeMetadata({
            ...columnDetails,
            name: columnDetails.name,
            type: columnDetails.type,
          });
        }
      }
    }
  }

  const repositoriesByModelNameLowered: RepositoriesByModelNameLowered = {};
  const repositoriesByModelName: RepositoriesByModelName = {};

  for (const modelName of modelNames) {
    const model = modelMetadataByModelName[modelName];
    if (!model) {
      throw new Error(`Unable to find @table() on ${modelName}`);
    }

    const columnsByPropertyName = columnsByPropertyNameForModel[modelName];
    if (!columnsByPropertyName) {
      throw new Error(`Did not find any columns decorated with @column. Model: ${modelName}`);
    }

    model.columns = Object.values(columnsByPropertyName);

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
      repositoriesByModelName[model.name] = repository;
    } else {
      repository = new Repository({
        modelMetadata: model,
        type: model.type,
        repositoriesByModelNameLowered,
        pool: modelPool,
        readonlyPool: modelReadonlyPool,
      });

      repositoriesByModelNameLowered[model.name.toLowerCase()] = repository;
      repositoriesByModelName[model.name] = repository;
    }

    if (expose) {
      expose(repository, model);
    }
  }

  return repositoriesByModelName;
}
