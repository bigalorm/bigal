import * as _ from 'lodash';
import { Pool } from 'postgres-pool';
import { ModelSchema } from './schema/ModelSchema';
import { Model } from './model';
import { Repository } from './Repository';
import { ModelClassesByGlobalId } from './ModelClassesByGlobalId';
import { ModelSchemasByGlobalId } from './schema/ModelSchemasByGlobalId';
import { Entity } from './Entity';

interface Connection {
  pool: Pool;
  readonlyPool?: Pool;
}

interface InitializeOptions extends Connection {
  modelSchemas: ModelSchema[];
  connections?: { [index: string]: Connection };
  expose: (repository: Repository<Entity>, modelSchema: ModelSchema) => void;
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
                             modelSchemas,
                             pool,
                             readonlyPool = pool,
                             connections = {},
                             expose,
                           }: InitializeOptions) {
  const modelClassesByGlobalId: ModelClassesByGlobalId = {};
  const modelSchemasByGlobalId: ModelSchemasByGlobalId = _.keyBy(modelSchemas, (schema) => {
    return schema.globalId.toLowerCase();
  });

  for (const modelSchema of modelSchemas) {
    let modelPool = pool;
    let modelReadonlyPool = readonlyPool;

    if (modelSchema.connection) {
      const modelConnection = connections[modelSchema.connection];
      if (modelConnection) {
        modelPool = modelConnection.pool || pool;
        modelReadonlyPool = modelConnection.readonlyPool || modelPool;
      }
    }

    const model = new Model({
      modelSchema,
      modelSchemasByGlobalId,
      modelClassesByGlobalId,
      pool: modelPool,
      readonlyPool: modelReadonlyPool,
    });

    modelClassesByGlobalId[modelSchema.globalId.toLowerCase()] = model;

    expose(model, modelSchema);
  }
}
