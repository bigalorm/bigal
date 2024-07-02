import _ from 'lodash';
import type { Pool } from 'postgres-pool';

import type { Entity, EntityStatic } from './Entity.js';
import type { IReadonlyRepository } from './IReadonlyRepository.js';
import type { IRepository } from './IRepository.js';
import type { ColumnMetadata, ColumnModifierMetadata } from './metadata/index.js';
import { ColumnModelMetadata, ColumnTypeMetadata, ModelMetadata, getMetadataStorage } from './metadata/index.js';
import { ReadonlyRepository } from './ReadonlyRepository.js';
import { Repository } from './Repository.js';

export * from './decorators/index.js';
export * from './Entity.js';
export * from './IReadonlyRepository.js';
export * from './IRepository.js';
export * from './metadata/index.js';
export * from './ReadonlyRepository.js';
export * from './Repository.js';
export * from './types/index.js';

export interface IConnection {
  pool: Pool;
  readonlyPool?: Pool;
}

export interface InitializeOptions extends IConnection {
  models: EntityStatic<Entity>[];
  connections?: Record<string, IConnection>;
  expose?: (repository: ReadonlyRepository<Entity> | Repository<Entity>, tableMetadata: ModelMetadata<Entity>) => void;
}

type ModelClass = EntityStatic<Entity> & {
  name: string;
};

// This will build an inverted array of inherited classes ([grandparent, parent, item])
function getInheritanceTree(model: ModelClass): ModelClass[] {
  const tree = [model];

  function getRecursivePrototypesOf(parentEntity: ModelClass): void {
    const proto = Object.getPrototypeOf(parentEntity) as ModelClass | undefined;
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
export function initialize({ models, pool, readonlyPool = pool, connections = {}, expose }: InitializeOptions): Record<string, IReadonlyRepository<Entity> | IRepository<Entity>> {
  if (!models.length) {
    throw new Error('Models need to be specified to read all model information from decorators');
  }

  const inheritanceTreesByModelName: Record<string, ModelClass[]> = {};
  const modelNames: string[] = [];
  for (const model of models) {
    // Load inheritance hierarchy for each model. This will make sure that any decorators on inherited class files are
    // added to metadata storage
    inheritanceTreesByModelName[model.name] = getInheritanceTree(model);
    modelNames.push(model.name);
  }

  // Assemble all metadata for complete model and column definitions
  const metadataStorage = getMetadataStorage();

  const modelMetadataByModelName: Record<string, ModelMetadata<Entity>> = {};
  for (const model of metadataStorage.models) {
    modelMetadataByModelName[model.name] = model;
  }

  type ColumnsByPropertyName = Record<string, ColumnMetadata>;
  // Add dictionary to quickly find a column by propertyName, for applying ColumnModifierMetadata records
  const columnsByPropertyNameForModel: Record<string, ColumnsByPropertyName> = {};
  for (const column of metadataStorage.columns) {
    const columns = columnsByPropertyNameForModel[column.target] ?? {};
    columns[column.propertyName] = column;

    columnsByPropertyNameForModel[column.target] = columns;
  }

  type ColumnModifiersByPropertyName = Record<string, ColumnModifierMetadata[]>;
  const columnModifiersByPropertyNameForModel: Record<string, ColumnModifiersByPropertyName> = {};
  for (const columnModifier of metadataStorage.columnModifiers) {
    const columnModifiersForModel = columnModifiersByPropertyNameForModel[columnModifier.target] ?? {};
    const columnModifiersForProperty = columnModifiersForModel[columnModifier.propertyName] ?? [];
    columnModifiersForProperty.push(columnModifier);

    columnModifiersForModel[columnModifier.propertyName] = columnModifiersForProperty;
    columnModifiersByPropertyNameForModel[columnModifier.target] = columnModifiersForModel;
  }

  // Aggregate columns from inherited classes
  // NOTE: Inherited @columns will be replaced if found on a child class. Column modifiers, however, are additive.
  // @column found on a child class will remove any previous modifier
  for (const model of models) {
    let modelMetadata: ModelMetadata<Entity> | undefined;
    let inheritedColumnsByPropertyName: ColumnsByPropertyName = {};
    const inheritedColumnModifiersByPropertyName = new Map<string, ColumnModifierMetadata[]>();
    for (const inheritedClass of inheritanceTreesByModelName[model.name] ?? []) {
      modelMetadata = modelMetadataByModelName[inheritedClass.name] ?? modelMetadata;
      const columnsByPropertyName = columnsByPropertyNameForModel[inheritedClass.name] ?? {};

      inheritedColumnsByPropertyName = {
        ...inheritedColumnsByPropertyName,
        ...columnsByPropertyName,
      };

      // Remove any previously defined column modifiers for this property since a new @column was found
      for (const [propertyName] of Object.entries(columnsByPropertyName)) {
        inheritedColumnModifiersByPropertyName.delete(propertyName);
      }

      const columnModifiersByPropertyName = columnModifiersByPropertyNameForModel[inheritedClass.name] ?? {};
      for (const [propertyName, columnModifiers] of Object.entries(columnModifiersByPropertyName)) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        inheritedColumnModifiersByPropertyName.set(propertyName, [...(inheritedColumnModifiersByPropertyName.get(propertyName) ?? []), ...(columnModifiers ?? [])]);
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
    columnModifiersByPropertyNameForModel[model.name] = Object.fromEntries(inheritedColumnModifiersByPropertyName);
  }

  // Process all column modifiers to augment any @column definitions
  for (const [modelName, columnModifiersByPropertyName] of Object.entries(columnModifiersByPropertyNameForModel)) {
    const columnsByPropertyName = columnsByPropertyNameForModel[modelName] ?? {};
    for (const [propertyName, columnModifiers] of Object.entries(columnModifiersByPropertyName)) {
      const column = columnsByPropertyName[propertyName];
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
          columnsByPropertyName[propertyName] = new ColumnModelMetadata({
            ...columnDetails,
            name: columnDetails.name,
            model: columnDetails.model,
          });
        } else if (columnDetails.type) {
          columnsByPropertyName[propertyName] = new ColumnTypeMetadata({
            ...columnDetails,
            name: columnDetails.name,
            type: columnDetails.type,
          });
        }
      }
    }

    columnsByPropertyNameForModel[modelName] = columnsByPropertyName;
  }

  const repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>> = {};
  const repositoriesByModelName: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>> = {};

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

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      modelPool = modelConnection.pool || pool;
      modelReadonlyPool = modelConnection.readonlyPool ?? modelPool;
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
