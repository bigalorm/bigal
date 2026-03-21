import type { Entity, EntityStatic } from './Entity.js';
import type { IReadonlyRepository } from './IReadonlyRepository.js';
import type { IRepository } from './IRepository.js';
import { ModelMetadata } from './metadata/ModelMetadata.js';
import { ReadonlyRepository } from './ReadonlyRepository.js';
import { Repository } from './Repository.js';
import type { InferSelect, SchemaDefinition } from './schema/InferTypes.js';
import type { TableDefinition } from './schema/TableDefinition.js';
import type { PoolLike } from './types/PoolLike.js';

export interface IConnection {
  pool: PoolLike;
  readonlyPool?: PoolLike;
}

export interface OnQueryEvent {
  sql: string;
  params: readonly unknown[];
  duration: number;
  error?: Error;
  model: string;
  operation: 'count' | 'create' | 'destroy' | 'find' | 'findOne' | 'update';
}

export type OnQueryCallback = (event: OnQueryEvent) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTableDefinition = TableDefinition<any, any>;

export interface BigAlOptions extends IConnection {
  models: AnyTableDefinition[];
  connections?: Record<string, IConnection>;
  onQuery?: OnQueryCallback;
}

/**
 * A BigAl instance created by `createBigAl()`.
 * Use `getRepository()` to obtain typed repositories for each table definition.
 */
export interface BigAlInstance {
  /**
   * Returns a read-write repository for the given table definition.
   * The repository type is inferred from the table's schema definition.
   */
  getRepository<TName extends string, TSchema extends SchemaDefinition>(tableDef: TableDefinition<TName, TSchema>): BigAlRepository<InferSelect<TSchema>>;

  /**
   * Returns a read-only repository for the given table definition.
   * The repository type is inferred from the table's schema definition.
   */
  getReadonlyRepository<TName extends string, TSchema extends SchemaDefinition>(tableDef: TableDefinition<TName, TSchema>): BigAlReadonlyRepository<InferSelect<TSchema>>;
}

/**
 * A repository type for the new function-based schema API.
 * This is structurally equivalent to `IRepository<T>` but without the `T extends Entity` constraint,
 * allowing plain inferred types from `table()` definitions.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BigAlRepository<T extends Record<string, any>> = IRepository<T & Entity>;

/**
 * A readonly repository type for the new function-based schema API.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BigAlReadonlyRepository<T extends Record<string, any>> = IReadonlyRepository<T & Entity>;

export function createBigAl({ pool, readonlyPool = pool, models, connections = {}, onQuery }: BigAlOptions): BigAlInstance {
  if (!models.length) {
    throw new Error('At least one model must be provided');
  }

  // DEBUG_BIGAL fallback: read once at construction time
  const resolvedOnQuery: OnQueryCallback | undefined =
    onQuery ??
    (process.env.DEBUG_BIGAL?.toLowerCase() === 'true'
      ? (event) => {
          // eslint-disable-next-line no-console
          console.log(`BigAl [${event.operation}] ${event.model}: ${event.sql}`, event.params);
        }
      : undefined);

  const repositoriesByModelNameLowered: Record<string, IReadonlyRepository<Entity> | IRepository<Entity>> = {};
  const repositoriesByTableDef = new Map<AnyTableDefinition, IReadonlyRepository<Entity> | IRepository<Entity>>();

  for (const tableDef of models) {
    const modelMetadata = buildModelMetadata(tableDef);

    let modelPool = pool;
    let modelReadonlyPool = readonlyPool;

    if (tableDef.connection) {
      const modelConnection = connections[tableDef.connection];
      if (!modelConnection) {
        throw new Error(`Unable to find connection (${tableDef.connection}) for table: ${tableDef.tableName}`);
      }

      modelPool = modelConnection.pool;
      modelReadonlyPool = modelConnection.readonlyPool ?? modelPool;
    }

    const entityStatic = createEntityStatic(tableDef);

    let repository: ReadonlyRepository<Entity> | Repository<Entity>;
    if (tableDef.isReadonly) {
      repository = new ReadonlyRepository({
        modelMetadata,
        type: entityStatic,
        repositoriesByModelNameLowered,
        pool: modelPool,
        readonlyPool: modelReadonlyPool,
        onQuery: resolvedOnQuery,
      });
    } else {
      repository = new Repository({
        modelMetadata,
        type: entityStatic,
        repositoriesByModelNameLowered,
        pool: modelPool,
        readonlyPool: modelReadonlyPool,
        onQuery: resolvedOnQuery,
      });
    }

    repositoriesByModelNameLowered[tableDef.tableName.toLowerCase()] = repository;
    repositoriesByTableDef.set(tableDef, repository);
  }

  // Validate all relationships resolve to registered models
  for (const tableDef of models) {
    validateRelationships(tableDef, repositoriesByModelNameLowered);
  }

  return {
    getRepository<TName extends string, TSchema extends SchemaDefinition>(tableDef: TableDefinition<TName, TSchema>): BigAlRepository<InferSelect<TSchema>> {
      const repository = repositoriesByTableDef.get(tableDef);
      if (!repository) {
        throw new Error(`Repository not found for table "${tableDef.tableName}". Was it included in the models array?`);
      }

      return repository as unknown as BigAlRepository<InferSelect<TSchema>>;
    },

    getReadonlyRepository<TName extends string, TSchema extends SchemaDefinition>(tableDef: TableDefinition<TName, TSchema>): BigAlReadonlyRepository<InferSelect<TSchema>> {
      const repository = repositoriesByTableDef.get(tableDef);
      if (!repository) {
        throw new Error(`Repository not found for table "${tableDef.tableName}". Was it included in the models array?`);
      }

      return repository as unknown as BigAlReadonlyRepository<InferSelect<TSchema>>;
    },
  };
}

function validateRelationships(tableDef: AnyTableDefinition, repositoriesByModelNameLowered: Record<string, unknown>): void {
  for (const entry of tableDef.belongsToEntries) {
    const referencedTable = entry.builder.modelFn();
    if (!repositoriesByModelNameLowered[referencedTable.tableName.toLowerCase()]) {
      throw new Error(`belongsTo reference from "${tableDef.tableName}.${entry.propertyName}" points to table "${referencedTable.tableName}" which is not registered`);
    }
  }

  for (const entry of tableDef.hasManyEntries) {
    const referencedTable = entry.builder.modelFn();
    if (!repositoriesByModelNameLowered[referencedTable.tableName.toLowerCase()]) {
      throw new Error(`hasMany reference from "${tableDef.tableName}.${entry.propertyName}" points to table "${referencedTable.tableName}" which is not registered`);
    }

    if (entry.builder.throughFn) {
      const throughTable = entry.builder.throughFn();
      if (!repositoriesByModelNameLowered[throughTable.tableName.toLowerCase()]) {
        throw new Error(`hasMany.through reference from "${tableDef.tableName}.${entry.propertyName}" points to junction table "${throughTable.tableName}" which is not registered`);
      }
    }
  }
}

function buildModelMetadata(tableDef: AnyTableDefinition): ModelMetadata<Entity> {
  const entityStatic = createEntityStatic(tableDef);

  const metadata = new ModelMetadata<Entity>({
    name: tableDef.tableName,
    type: entityStatic,
    connection: tableDef.connection,
    schema: tableDef.dbSchema,
    tableName: tableDef.tableName,
    readonly: tableDef.isReadonly,
  });

  metadata.columns = tableDef.columns;

  return metadata;
}

function createEntityStatic(tableDef: AnyTableDefinition): EntityStatic<Entity> {
  // Use a constructor function (not a class) so that instances are plain objects.
  // This ensures Object.getPrototypeOf(new PlainEntity()) === Object.prototype,
  // which matters for deep equality checks (e.g. toStrictEqual).
  function PlainEntity(this: Entity) {
    // intentionally empty
  }

  PlainEntity.prototype = Object.prototype;

  if (tableDef.hooks?.beforeCreate) {
    const hookFn = tableDef.hooks.beforeCreate;
    (PlainEntity as unknown as EntityStatic<Entity>).beforeCreate = (values) => hookFn(values);
  }

  if (tableDef.hooks?.beforeUpdate) {
    const hookFn = tableDef.hooks.beforeUpdate;
    (PlainEntity as unknown as EntityStatic<Entity>).beforeUpdate = (values) => hookFn(values);
  }

  return PlainEntity as unknown as EntityStatic<Entity>;
}
