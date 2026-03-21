import type { IReadonlyRepository } from './IReadonlyRepository.js';
import type { IRepository } from './IRepository.js';
import { ModelMetadata } from './metadata/ModelMetadata.js';
import { ReadonlyRepository } from './ReadonlyRepository.js';
import { Repository } from './Repository.js';
import type { InferSelect, SchemaDefinition } from './schema/InferTypes.js';
import type { TableDefinition } from './schema/TableDefinition.js';
import type { PoolLike } from './types/PoolLike.js';

type AnyRecord = Record<string, unknown>;

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
  getRepository<TName extends string, TSchema extends SchemaDefinition>(tableDef: TableDefinition<TName, TSchema>): IRepository<InferSelect<TSchema>>;

  /**
   * Returns a read-only repository for the given table definition.
   * The repository type is inferred from the table's schema definition.
   */
  getReadonlyRepository<TName extends string, TSchema extends SchemaDefinition>(tableDef: TableDefinition<TName, TSchema>): IReadonlyRepository<InferSelect<TSchema>>;
}

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

  const repositoriesByModelNameLowered: Record<string, IReadonlyRepository<AnyRecord> | IRepository<AnyRecord>> = {};
  const repositoriesByTableDef = new Map<AnyTableDefinition, IReadonlyRepository<AnyRecord> | IRepository<AnyRecord>>();

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

    let repository: ReadonlyRepository<AnyRecord> | Repository<AnyRecord>;
    if (tableDef.isReadonly) {
      repository = new ReadonlyRepository({
        modelMetadata,
        repositoriesByModelNameLowered,
        pool: modelPool,
        readonlyPool: modelReadonlyPool,
        onQuery: resolvedOnQuery,
      });
    } else {
      repository = new Repository({
        modelMetadata,
        repositoriesByModelNameLowered,
        pool: modelPool,
        readonlyPool: modelReadonlyPool,
        onQuery: resolvedOnQuery,
        beforeCreate: tableDef.hooks?.beforeCreate,
        beforeUpdate: tableDef.hooks?.beforeUpdate,
      });
    }

    repositoriesByModelNameLowered[tableDef.modelName.toLowerCase()] = repository;
    repositoriesByTableDef.set(tableDef, repository);
  }

  // Validate all relationships resolve to registered models
  for (const tableDef of models) {
    validateRelationships(tableDef, repositoriesByModelNameLowered);
  }

  return {
    getRepository<TName extends string, TSchema extends SchemaDefinition>(tableDef: TableDefinition<TName, TSchema>): IRepository<InferSelect<TSchema>> {
      const repository = repositoriesByTableDef.get(tableDef);
      if (!repository) {
        throw new Error(`Repository not found for table "${tableDef.tableName}". Was it included in the models array?`);
      }

      return repository as unknown as IRepository<InferSelect<TSchema>>;
    },

    getReadonlyRepository<TName extends string, TSchema extends SchemaDefinition>(tableDef: TableDefinition<TName, TSchema>): IReadonlyRepository<InferSelect<TSchema>> {
      const repository = repositoriesByTableDef.get(tableDef);
      if (!repository) {
        throw new Error(`Repository not found for table "${tableDef.tableName}". Was it included in the models array?`);
      }

      return repository as unknown as IReadonlyRepository<InferSelect<TSchema>>;
    },
  };
}

function validateRelationships(tableDef: AnyTableDefinition, repositoriesByModelNameLowered: Record<string, unknown>): void {
  for (const entry of tableDef.belongsToEntries) {
    const referencedTable = entry.builder.modelFn();
    if (!repositoriesByModelNameLowered[referencedTable.modelName.toLowerCase()]) {
      throw new Error(`belongsTo reference from "${tableDef.modelName}.${entry.propertyName}" points to model "${referencedTable.modelName}" which is not registered`);
    }
  }

  for (const entry of tableDef.hasManyEntries) {
    const referencedTable = entry.builder.modelFn();
    if (!repositoriesByModelNameLowered[referencedTable.modelName.toLowerCase()]) {
      throw new Error(`hasMany reference from "${tableDef.modelName}.${entry.propertyName}" points to model "${referencedTable.modelName}" which is not registered`);
    }

    if (entry.builder.throughFn) {
      const throughTable = entry.builder.throughFn();
      if (!repositoriesByModelNameLowered[throughTable.modelName.toLowerCase()]) {
        throw new Error(`hasMany.through reference from "${tableDef.modelName}.${entry.propertyName}" points to junction model "${throughTable.modelName}" which is not registered`);
      }
    }
  }
}

function buildModelMetadata(tableDef: AnyTableDefinition): ModelMetadata<AnyRecord> {
  const metadata = new ModelMetadata<AnyRecord>({
    name: tableDef.modelName,
    connection: tableDef.connection,
    schema: tableDef.dbSchema,
    tableName: tableDef.tableName,
    readonly: tableDef.isReadonly,
  });

  metadata.columns = tableDef.columns;

  return metadata;
}
