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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- variance: hooks use contravariant function params
type AnyModel = TableDefinition<string, any>;

/** Infers the repository type for a model — readonly or read-write based on the model's isReadonly flag */
type InferRepository<T extends AnyModel> =
  T extends TableDefinition<string, infer TSchema> ? (T['isReadonly'] extends true ? IReadonlyRepository<InferSelect<TSchema>> : IRepository<InferSelect<TSchema>>) : never;

/** Maps a named models object to a typed repositories object */
type RepositoryMap<TModels extends Record<string, AnyModel>> = {
  [K in keyof TModels]: InferRepository<TModels[K]>;
};

// --- Options: array-style ---

export interface BigAlOptionsWithArray extends IConnection {
  models: AnyModel[];
  connections?: Record<string, IConnection>;
  onQuery?: OnQueryCallback;
}

// --- Options: object-style (enables typed repos) ---

export interface BigAlOptionsWithObject<TModels extends Record<string, AnyModel>> extends IConnection {
  models: TModels;
  connections?: Record<string, IConnection>;
  onQuery?: OnQueryCallback;
}

// --- Return types ---

export interface BigAlInstance {
  getRepository<TName extends string, TSchema extends SchemaDefinition>(model: TableDefinition<TName, TSchema>): IRepository<InferSelect<TSchema>>;

  getReadonlyRepository<TName extends string, TSchema extends SchemaDefinition>(model: TableDefinition<TName, TSchema>): IReadonlyRepository<InferSelect<TSchema>>;
}

export type BigAlInstanceWithRepos<TModels extends Record<string, AnyModel>> = BigAlInstance & RepositoryMap<TModels>;

// --- Overloads ---

/**
 * Creates a BigAl instance with a named models object.
 * Returns typed repositories directly: `const { Product, Store } = createBigAl({ models: { Product, Store }, pool })`.
 *
 * @param {BigAlOptionsWithObject} options - Pool, models object, and optional config
 */
export function createBigAl<TModels extends Record<string, AnyModel>>(options: BigAlOptionsWithObject<TModels>): BigAlInstanceWithRepos<TModels>;

/**
 * Creates a BigAl instance with a models array.
 * Use `getRepository(model)` to obtain typed repositories.
 *
 * @param {BigAlOptionsWithArray} options - Pool, models array, and optional config
 */
export function createBigAl(options: BigAlOptionsWithArray): BigAlInstance;

export function createBigAl<TModels extends Record<string, AnyModel>>(options: BigAlOptionsWithArray | BigAlOptionsWithObject<TModels>): BigAlInstance | BigAlInstanceWithRepos<TModels> {
  const { pool, readonlyPool = pool, connections = {}, onQuery } = options;
  const isObjectModels = !Array.isArray(options.models);
  const modelsArray: AnyModel[] = isObjectModels ? Object.values(options.models) : (options.models as AnyModel[]);

  if (!modelsArray.length) {
    throw new Error('At least one model must be provided');
  }

  // DEBUG_BIGAL fallback: read once at construction time
  const resolvedOnQuery: OnQueryCallback | undefined =
    onQuery ??
    (process.env.DEBUG_BIGAL?.toLowerCase() === 'true'
      ? (event) => {
          // eslint-disable-next-line no-console -- DEBUG_BIGAL is an intentional console logging feature
          console.log(`BigAl [${event.operation}] ${event.model}: ${event.sql}`, event.params);
        }
      : undefined);

  const repositoriesByModelNameLowered: Record<string, IReadonlyRepository<AnyRecord> | IRepository<AnyRecord>> = {};
  const repositoriesByModel = new Map<AnyModel, IReadonlyRepository<AnyRecord> | IRepository<AnyRecord>>();

  for (const model of modelsArray) {
    const modelMetadata = buildModelMetadata(model);

    let modelPool = pool;
    let modelReadonlyPool = readonlyPool;

    if (model.connection) {
      const modelConnection = connections[model.connection];
      if (!modelConnection) {
        throw new Error(`Unable to find connection (${model.connection}) for table: ${model.tableName}`);
      }

      modelPool = modelConnection.pool;
      modelReadonlyPool = modelConnection.readonlyPool ?? modelPool;
    }

    let repository: ReadonlyRepository<AnyRecord> | Repository<AnyRecord>;
    if (model.isReadonly) {
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
        beforeCreate: model.hooks?.beforeCreate,
        beforeUpdate: model.hooks?.beforeUpdate,
      });
    }

    repositoriesByModelNameLowered[model.modelName.toLowerCase()] = repository;
    repositoriesByModel.set(model, repository);
  }

  // Validate all relationships resolve to registered models
  for (const model of modelsArray) {
    validateRelationships(model, repositoriesByModelNameLowered);
  }

  const instance: BigAlInstance = {
    getRepository<TName extends string, TSchema extends SchemaDefinition>(model: TableDefinition<TName, TSchema>): IRepository<InferSelect<TSchema>> {
      const repository = repositoriesByModel.get(model);
      if (!repository) {
        throw new Error(`Repository not found for table "${model.tableName}". Was it included in the models array?`);
      }

      return repository as unknown as IRepository<InferSelect<TSchema>>;
    },

    getReadonlyRepository<TName extends string, TSchema extends SchemaDefinition>(model: TableDefinition<TName, TSchema>): IReadonlyRepository<InferSelect<TSchema>> {
      const repository = repositoriesByModel.get(model);
      if (!repository) {
        throw new Error(`Repository not found for table "${model.tableName}". Was it included in the models array?`);
      }

      return repository as unknown as IReadonlyRepository<InferSelect<TSchema>>;
    },
  };

  // If models were passed as an object, attach typed repos directly
  if (isObjectModels) {
    const modelsObject = options.models as Record<string, AnyModel>;
    for (const [key, model] of Object.entries(modelsObject)) {
      const repository = repositoriesByModel.get(model);
      if (repository) {
        (instance as unknown as Record<string, unknown>)[key] = repository;
      }
    }
  }

  return instance as BigAlInstanceWithRepos<TModels>;
}

function resolveModelName(ref: AnyModel['belongsToEntries'][number]['builder']['modelRef']): string {
  if (typeof ref === 'string') {
    return ref;
  }

  return ref().modelName;
}

function validateRelationships(model: AnyModel, repositoriesByModelNameLowered: Record<string, unknown>): void {
  for (const entry of model.belongsToEntries) {
    const modelName = resolveModelName(entry.builder.modelRef);
    if (!repositoriesByModelNameLowered[modelName.toLowerCase()]) {
      throw new Error(`belongsTo reference from "${model.modelName}.${entry.propertyName}" points to model "${modelName}" which is not registered`);
    }
  }

  for (const entry of model.hasManyEntries) {
    const modelName = resolveModelName(entry.builder.modelRef);
    if (!repositoriesByModelNameLowered[modelName.toLowerCase()]) {
      throw new Error(`hasMany reference from "${model.modelName}.${entry.propertyName}" points to model "${modelName}" which is not registered`);
    }

    if (entry.builder.throughRef) {
      const throughName = resolveModelName(entry.builder.throughRef);
      if (!repositoriesByModelNameLowered[throughName.toLowerCase()]) {
        throw new Error(`hasMany.through reference from "${model.modelName}.${entry.propertyName}" points to junction model "${throughName}" which is not registered`);
      }
    }
  }
}

function buildModelMetadata(model: AnyModel): ModelMetadata<AnyRecord> {
  const metadata = new ModelMetadata<AnyRecord>({
    name: model.modelName,
    connection: model.connection,
    schema: model.dbSchema,
    tableName: model.tableName,
    readonly: model.isReadonly,
  });

  metadata.columns = model.columns;

  return metadata;
}
