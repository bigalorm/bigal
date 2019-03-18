// @ts-ignore
import chai from 'chai';
import * as _ from 'lodash';
import * as faker from 'faker';

import { SqlHelper as sqlHelper } from '../src/SqlHelper';
import {ModelSchema} from "../src/schema/ModelSchema";
import {ModelSchemasByGlobalId} from "../src/schema/ModelSchemasByGlobalId";

describe('sqlHelper', () => {
  let should: Chai.Should;
  before(() => {
    should = chai.should();
  });

  const storeSchema: ModelSchema = {
    globalId: 'store',
    tableName: 'store',
    attributes: {
      id: {
        type: 'integer',
        primaryKey: true,
      },
      name: {
        type: 'string',
      },
      products: {
        collection: 'product',
        via: 'store',
      },
    },
  };
  const productSchema: ModelSchema = {
    globalId: 'product',
    tableName: 'product',
    attributes: {
      id: {
        type: 'integer',
        primaryKey: true,
      },
      name: {
        type: 'string',
        required: true,
      },
      sku: {
        type: 'string',
        columnName: 'sku',
      },
      store: {
        model: 'store',
        columnName: 'store_id',
      },
      categories: {
        collection: 'category',
        via: 'category',
        through: 'productCategory',
      },
      createdAt: {
        type: 'datetime',
        columnName: 'created_at',
      },
    },
  };
  const categorySchema: ModelSchema = {
    globalId: 'category',
    tableName: 'category',
    attributes: {
      id: {
        type: 'integer',
        primaryKey: true,
      },
      name: {
        type: 'string',
      },
    },
  };
  const productCategorySchema: ModelSchema = {
    globalId: 'productCategory',
    tableName: 'product__category',
    attributes: {
      id: {
        type: 'integer',
        primaryKey: true,
      },
      product: {
        model: 'product',
        columnName: 'product_id',
      },
      category: {
        model: 'category',
        columnName: 'category_id',
      },
    },
  };
  const schemas = [
    storeSchema,
    productSchema,
    categorySchema,
    productCategorySchema,
  ];
  const modelSchemasByGlobalId: ModelSchemasByGlobalId = _.keyBy(schemas, (schema) => {
    return schema.globalId.toLowerCase();
  });

  describe('#getSelectQueryAndParams()', () => {
    describe('select', () => {
      it('should include all columns if select is undefined', () => {
        const {
          query,
          params,
        } = sqlHelper.getSelectQueryAndParams({
          modelSchemasByGlobalId,
          schema: productSchema,
          where: {},
          sorts: [],
          limit: 1,
          skip: 0,
        });

        query.should.equal(`SELECT "id","name","sku","store_id" AS "store","created_at" AS "createdAt" FROM "${productSchema.tableName}"`);
        params.should.deep.equal([]);
      });
      it('should include primaryKey column if select is empty', () => {
        const {
          query,
          params,
        } = sqlHelper.getSelectQueryAndParams({
          modelSchemasByGlobalId,
          schema: productSchema,
          select: [],
          where: {},
          sorts: [],
          limit: 1,
          skip: 0,
        });

        query.should.equal(`SELECT "id" FROM "${productSchema.tableName}"`);
        params.should.deep.equal([]);
      });
      it('should include primaryKey column if select does not include it', () => {
        const {
          query,
          params,
        } = sqlHelper.getSelectQueryAndParams({
          modelSchemasByGlobalId,
          schema: productSchema,
          select: ['name'],
          where: {},
          sorts: [],
          limit: 1,
          skip: 0,
        });

        query.should.equal(`SELECT "name","id" FROM "${productSchema.tableName}"`);
        params.should.deep.equal([]);
      });
    });
    describe('where', () => {
      it('should include where statement if defined', () => {
        const name = faker.random.uuid();
        const {
          query,
          params,
        } = sqlHelper.getSelectQueryAndParams({
          modelSchemasByGlobalId,
          schema: productSchema,
          where: {
            name,
          },
          sorts: [],
          limit: 1,
          skip: 0,
        });

        query.should.equal(`SELECT "id","name","sku","store_id" AS "store","created_at" AS "createdAt" FROM "${productSchema.tableName}" WHERE "name"=$1`);
        params.should.deep.equal([name]);
      });
    });
    describe('sorts', () => {
      it('should include order by statement if defined', () => {
        const {
          query,
          params,
        } = sqlHelper.getSelectQueryAndParams({
          modelSchemasByGlobalId,
          schema: productSchema,
          sorts: ['name'],
          where: {},
          limit: 1,
          skip: 0,
        });

        query.should.equal(`SELECT "id","name","sku","store_id" AS "store","created_at" AS "createdAt" FROM "${productSchema.tableName}" ORDER BY "name"`);
        params.should.deep.equal([]);
      });
    });
    describe('skip', () => {
      it('should include OFFSET statement if skip is a number', () => {
        const {
          query,
          params,
        } = sqlHelper.getSelectQueryAndParams({
          modelSchemasByGlobalId,
          schema: productSchema,
          where: {},
          sorts: [],
          limit: 1,
          skip: 100,
        });

        query.should.equal(`SELECT "id","name","sku","store_id" AS "store","created_at" AS "createdAt" FROM "${productSchema.tableName}" OFFSET 100`);
        params.should.deep.equal([]);
      });
    });
    describe('limit', () => {
      it('should include LIMIT statement if limit is a number', () => {
        const {
          query,
          params,
        } = sqlHelper.getSelectQueryAndParams({
          modelSchemasByGlobalId,
          schema: productSchema,
          where: {},
          sorts: [],
          skip: 0,
          limit: 100,
        });

        query.should.equal(`SELECT "id","name","sku","store_id" AS "store","created_at" AS "createdAt" FROM "${productSchema.tableName}" LIMIT 100`);
        params.should.deep.equal([]);
      });
    });
  });
  describe('#getCountQueryAndParams()', () => {
    it('should count all records if no where statement is defined', () => {
      const {
        query,
        params,
      } = sqlHelper.getCountQueryAndParams({
        modelSchemasByGlobalId,
        schema: productSchema,
      });

      query.should.equal(`SELECT count(*) AS "count" FROM "${productSchema.tableName}"`);
      params.should.deep.equal([]);
    });
    it('should include where statement if defined', () => {
      const store = {
        id: faker.random.uuid(),
        name: `store - ${faker.random.uuid()}`,
      };

      const {
        query,
        params,
      } = sqlHelper.getCountQueryAndParams({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          store,
        },
      });

      query.should.equal(`SELECT count(*) AS "count" FROM "${productSchema.tableName}" WHERE "store_id"=$1`);
      params.should.deep.equal([
        store.id,
      ]);
    });
  });
  describe('#getInsertQueryAndParams()', () => {
    it('should throw if a required property has an undefined value', () => {
      (() => {
        sqlHelper.getInsertQueryAndParams({
          modelSchemasByGlobalId,
          schema: productSchema,
          values: {
            store: faker.random.uuid(),
          },
          returnRecords: true,
        });
      }).should.throw(Error, `Create statement for "${productSchema.globalId}" is missing value for required field: name`);
    });
    it('should not throw if a required property has a defaultValue and an undefined initial value', () => {
      const schema: ModelSchema = {
        globalId: 'foo',
        tableName: 'foo',
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true,
          },
          name: {
            type: 'string',
            required: true,
            defaultsTo: 'foobar',
          },
          bar: {
            type: 'string',
          },
        },
      };

      (() => {
        sqlHelper.getInsertQueryAndParams({
          modelSchemasByGlobalId,
          schema,
          values: {
            bar: faker.random.uuid(),
          },
          returnRecords: true,
        });
      }).should.not.throw();
    });
    it('should not override properties with defaultValue if value is defined', () => {
      const schema: ModelSchema = {
        globalId: 'foo',
        tableName: 'foo',
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true,
          },
          name: {
            type: 'string',
            defaultsTo: 'foobar',
          },
        },
      };

      const name = faker.random.uuid();
      const {
        params,
      } = sqlHelper.getInsertQueryAndParams({
        modelSchemasByGlobalId,
        schema,
        values: {
          name,
        },
        returnRecords: true,
      });

      params.should.deep.equal([name]);
    });
    it('should set undefined properties to defaultValue if defined on schema', () => {
      const schema: ModelSchema = {
        globalId: 'foo',
        tableName: 'foo',
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true,
          },
          name: {
            type: 'string',
            defaultsTo: 'foobar',
          },
          bar: {
            type: 'string',
          },
        },
      };

      const bar = faker.random.uuid();
      const {
        params,
      } = sqlHelper.getInsertQueryAndParams({
        modelSchemasByGlobalId,
        schema,
        values: {
          bar,
        },
      });

      params.should.deep.equal([
        'foobar',
        bar,
      ]);
    });
    it('should set undefined properties to result of defaultValue function if defined on schema', () => {
      const schema: ModelSchema = {
        globalId: 'foo',
        tableName: 'foo',
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true,
          },
          name: {
            type: 'string',
            defaultsTo: () => {
              return 'foobar';
            },
          },
          bar: {
            type: 'string',
          },
        },
      };

      const bar = faker.random.uuid();
      const {
        params,
      } = sqlHelper.getInsertQueryAndParams({
        modelSchemasByGlobalId,
        schema,
        values: {
          bar,
        },
      });

      params.should.deep.equal([
        'foobar',
        bar,
      ]);
    });
    it('should set createdAt if schema.autoCreatedAt and value is undefined', () => {
      const beforeTime = new Date();
      const schema: ModelSchema = {
        globalId: 'foo',
        tableName: 'foo',
        autoCreatedAt: true,
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true,
          },
          name: {
            type: 'string',
          },
          createdAt: {
            type: 'datetime',
            columnName: 'created_at',
          },
        },
      };

      const name = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getInsertQueryAndParams({
        modelSchemasByGlobalId,
        schema,
        values: {
          name,
        },
      });

      query.should.equal(`INSERT INTO "${schema.tableName}" ("name","created_at") VALUES ($1,$2) RETURNING "id","name","created_at" AS "createdAt"`);
      params.should.have.length(2);
      const afterTime = new Date();
      for (const [index, value] of params.entries()) {
        if (index === 0) {
          value.should.equal(name);
        } else if (index === 1) {
          (beforeTime <= value && value <= afterTime).should.equal(true);
        }
      }
    });
    it('should not override createdAt if schema.autoCreatedAt and value is defined', () => {
      const createdAt = faker.date.past();
      const schema: ModelSchema = {
        globalId: 'foo',
        tableName: 'foo',
        autoCreatedAt: true,
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true,
          },
          name: {
            type: 'string',
          },
          createdAt: {
            type: 'datetime',
            columnName: 'created_at',
          },
        },
      };

      const name = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getInsertQueryAndParams({
        modelSchemasByGlobalId,
        schema,
        values: {
          name,
          createdAt,
        },
      });

      query.should.equal(`INSERT INTO "${schema.tableName}" ("name","created_at") VALUES ($1,$2) RETURNING "id","name","created_at" AS "createdAt"`);
      params.should.deep.equal([
        name,
        createdAt,
      ]);
    });
    it('should set updatedAt if schema.autoUpdatedAt and value is undefined', () => {
      const beforeTime = new Date();
      const schema: ModelSchema = {
        globalId: 'foo',
        tableName: 'foo',
        autoUpdatedAt: true,
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true,
          },
          name: {
            type: 'string',
          },
          updatedAt: {
            type: 'datetime',
            columnName: 'updated_at',
          },
        },
      };

      const name = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getInsertQueryAndParams({
        modelSchemasByGlobalId,
        schema,
        values: {
          name,
        },
      });

      query.should.equal(`INSERT INTO "${schema.tableName}" ("name","updated_at") VALUES ($1,$2) RETURNING "id","name","updated_at" AS "updatedAt"`);
      params.should.have.length(2);
      const afterTime = new Date();
      for (const [index, value] of params.entries()) {
        if (index === 0) {
          value.should.equal(name);
        } else if (index === 1) {
          (beforeTime <= value && value <= afterTime).should.equal(true);
        }
      }
    });
    it('should not override updatedAt if schema.autoUpdatedAt and value is defined', () => {
      const updatedAt = faker.date.past();
      const schema: ModelSchema = {
        globalId: 'foo',
        tableName: 'foo',
        autoUpdatedAt: true,
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true,
          },
          name: {
            type: 'string',
          },
          updatedAt: {
            type: 'datetime',
            columnName: 'updated_at',
          },
        },
      };

      const name = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getInsertQueryAndParams({
        modelSchemasByGlobalId,
        schema,
        values: {
          name,
          updatedAt,
        },
      });

      query.should.equal(`INSERT INTO "${schema.tableName}" ("name","updated_at") VALUES ($1,$2) RETURNING "id","name","updated_at" AS "updatedAt"`);
      params.should.deep.equal([
        name,
        updatedAt,
      ]);
    });
    it('should ignore collection properties', () => {
      const schema: ModelSchema = {
        globalId: 'foo',
        tableName: 'foo',
        autoUpdatedAt: true,
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true,
          },
          name: {
            type: 'string',
          },
          bars: {
            collection: 'bar',
            via: 'foo',
          },
          bats: {
            collection: 'bats',
            through: 'foo__bats',
            via: 'foo',
          },
        },
      };

      const name = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getInsertQueryAndParams({
        modelSchemasByGlobalId,
        schema,
        values: {
          name,
          bars: [faker.random.uuid()],
          bats: [faker.random.uuid()],
        },
      });

      query.should.equal(`INSERT INTO "${schema.tableName}" ("name") VALUES ($1) RETURNING "id","name"`);
      params.should.deep.equal([
        name,
      ]);
    });
    it('should use primaryKey value if hydrated object is passed as a value', () => {
      const store = {
        id: faker.random.uuid(),
        name: `store - ${faker.random.uuid()}`,
      };

      const name = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getInsertQueryAndParams({
        modelSchemasByGlobalId,
        schema: productSchema,
        values: {
          name,
          store,
        },
      });

      query.should.equal(`INSERT INTO "${productSchema.tableName}" ("name","store_id") VALUES ($1,$2) RETURNING "id","name","sku","store_id" AS "store","created_at" AS "createdAt"`);
      params.should.deep.equal([
        name,
        store.id,
      ]);
    });
    it('should cast value to jsonb if type=json and value is an array', () => {
      // Please see https://github.com/brianc/node-postgres/issues/442 for details of why this is needed
      const schema: ModelSchema = {
        globalId: 'foo',
        tableName: 'foo',
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true,
          },
          name: {
            type: 'string',
            required: true,
            defaultsTo: 'foobar',
          },
          bar: {
            type: 'json',
          },
        },
      };

      const name = faker.random.uuid();
      const bar = [{
        foo: faker.random.uuid(),
      }];

      const {
        query,
        params,
      } = sqlHelper.getInsertQueryAndParams({
        modelSchemasByGlobalId,
        schema,
        values: {
          name,
          bar,
        },
      });

      query.should.equal(`INSERT INTO "${schema.tableName}" ("name","bar") VALUES ($1,$2::jsonb) RETURNING "id","name","bar"`);
      params.should.deep.equal([
        name,
        JSON.stringify(bar),
      ]);
    });
    it('should support inserting a single record and return records if returnRecords=true', () => {
      const storeId = faker.random.uuid();
      const name = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getInsertQueryAndParams({
        modelSchemasByGlobalId,
        schema: productSchema,
        values: {
          name,
          store: storeId,
        },
        returnRecords: true,
      });

      query.should.equal(`INSERT INTO "${productSchema.tableName}" ("name","store_id") VALUES ($1,$2) RETURNING "id","name","sku","store_id" AS "store","created_at" AS "createdAt"`);
      params.should.deep.equal([
        name,
        storeId,
      ]);
    });
    it('should support inserting a single record and return specific columns for records, if returnRecords=true and returnSelect is defined', () => {
      const storeId = faker.random.uuid();
      const name = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getInsertQueryAndParams({
        modelSchemasByGlobalId,
        schema: productSchema,
        values: {
          name,
          store: storeId,
        },
        returnRecords: true,
        returnSelect: ['name'],
      });

      query.should.equal(`INSERT INTO "${productSchema.tableName}" ("name","store_id") VALUES ($1,$2) RETURNING "name","id"`);
      params.should.deep.equal([
        name,
        storeId,
      ]);
    });
    it('should support inserting a single record and not return records if returnRecords=false', () => {
      const storeId = faker.random.uuid();
      const name = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getInsertQueryAndParams({
        modelSchemasByGlobalId,
        schema: productSchema,
        values: {
          name,
          store: storeId,
        },
        returnRecords: false,
      });

      query.should.equal(`INSERT INTO "${productSchema.tableName}" ("name","store_id") VALUES ($1,$2)`);
      params.should.deep.equal([
        name,
        storeId,
      ]);
    });
    it('should support inserting multiple records and return specific columns for records, if returnRecords=true and returnSelect is defined', () => {
      const storeId1 = faker.random.uuid();
      const name1 = faker.random.uuid();
      const storeId2 = faker.random.uuid();
      const name2 = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getInsertQueryAndParams({
        modelSchemasByGlobalId,
        schema: productSchema,
        values: [{
          name: name1,
          store: storeId1,
        }, {
          name: name2,
          store: storeId2,
        }],
        returnRecords: true,
        returnSelect: ['store'],
      });

      query.should.equal(`INSERT INTO "${productSchema.tableName}" ("name","store_id") VALUES ($1,$3),($2,$4) RETURNING "store_id" AS "store","id"`);
      params.should.deep.equal([
        name1,
        name2,
        storeId1,
        storeId2,
      ]);
    });
    it('should support inserting multiple records and return records if returnRecords=true', () => {
      const storeId1 = faker.random.uuid();
      const name1 = faker.random.uuid();
      const storeId2 = faker.random.uuid();
      const name2 = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getInsertQueryAndParams({
        modelSchemasByGlobalId,
        schema: productSchema,
        values: [{
          name: name1,
          store: storeId1,
        }, {
          name: name2,
          store: storeId2,
        }],
      });

      query.should.equal(`INSERT INTO "${productSchema.tableName}" ("name","store_id") VALUES ($1,$3),($2,$4) RETURNING "id","name","sku","store_id" AS "store","created_at" AS "createdAt"`);
      params.should.deep.equal([
        name1,
        name2,
        storeId1,
        storeId2,
      ]);
    });
    it('should support inserting multiple records and not return records if returnRecords=false', () => {
      const storeId1 = faker.random.uuid();
      const name1 = faker.random.uuid();
      const storeId2 = faker.random.uuid();
      const name2 = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getInsertQueryAndParams({
        modelSchemasByGlobalId,
        schema: productSchema,
        values: [{
          name: name1,
          store: storeId1,
        }, {
          name: name2,
          store: storeId2,
        }],
        returnRecords: false,
      });

      query.should.equal(`INSERT INTO "${productSchema.tableName}" ("name","store_id") VALUES ($1,$3),($2,$4)`);
      params.should.deep.equal([
        name1,
        name2,
        storeId1,
        storeId2,
      ]);
    });
  });
  describe('#getUpdateQueryAndParams()', () => {
    it('should not set createdAt if schema.autoCreatedAt and value is undefined', () => {
      const schema: ModelSchema = {
        globalId: 'foo',
        tableName: 'foo',
        autoCreatedAt: true,
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true,
          },
          name: {
            type: 'string',
          },
          createdAt: {
            type: 'datetime',
            columnName: 'created_at',
          },
        },
      };

      const name = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getUpdateQueryAndParams({
        modelSchemasByGlobalId,
        schema,
        where: {},
        values: {
          name,
        },
      });

      query.should.equal(`UPDATE "${schema.tableName}" SET "name"=$1 RETURNING "id","name","created_at" AS "createdAt"`);
      params.should.deep.equal([
        name,
      ]);
    });
    it('should set updatedAt if schema.autoUpdatedAt and value is undefined', () => {
      const beforeTime = new Date();
      const schema: ModelSchema = {
        globalId: 'foo',
        tableName: 'foo',
        autoUpdatedAt: true,
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true,
          },
          name: {
            type: 'string',
          },
          updatedAt: {
            type: 'datetime',
            columnName: 'updated_at',
          },
        },
      };

      const name = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getUpdateQueryAndParams({
        modelSchemasByGlobalId,
        schema,
        where: {},
        values: {
          name,
        },
      });

      query.should.equal(`UPDATE "${schema.tableName}" SET "name"=$1,"updated_at"=$2 RETURNING "id","name","updated_at" AS "updatedAt"`);
      params.should.have.length(2);
      const afterTime = new Date();
      for (const [index, value] of params.entries()) {
        if (index === 0) {
          value.should.equal(name);
        } else if (index === 1) {
          (beforeTime <= value && value <= afterTime).should.equal(true);
        }
      }
    });
    it('should not override updatedAt if schema.autoUpdatedAt and value is defined', () => {
      const updatedAt = faker.date.past();
      const schema: ModelSchema = {
        globalId: 'foo',
        tableName: 'foo',
        autoUpdatedAt: true,
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true,
          },
          name: {
            type: 'string',
          },
          updatedAt: {
            type: 'datetime',
            columnName: 'updated_at',
          },
        },
      };

      const name = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getUpdateQueryAndParams({
        modelSchemasByGlobalId,
        schema,
        where: {},
        values: {
          name,
          updatedAt,
        },
      });

      query.should.equal(`UPDATE "${schema.tableName}" SET "name"=$1,"updated_at"=$2 RETURNING "id","name","updated_at" AS "updatedAt"`);
      params.should.deep.equal([
        name,
        updatedAt,
      ]);
    });
    it('should ignore collection properties', () => {
      const schema: ModelSchema = {
        globalId: 'foo',
        tableName: 'foo',
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true,
          },
          name: {
            type: 'string',
          },
          bars: {
            collection: 'bar',
            via: 'foo',
          },
          bats: {
            collection: 'bats',
            through: 'foo__bats',
            via: 'foo',
          },
        },
      };

      const name = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getUpdateQueryAndParams({
        modelSchemasByGlobalId,
        schema,
        where: {},
        values: {
          name,
          bars: [faker.random.uuid()],
          bats: [faker.random.uuid()],
        },
      });

      query.should.equal(`UPDATE "${schema.tableName}" SET "name"=$1 RETURNING "id","name"`);
      params.should.deep.equal([
        name,
      ]);
    });
    it('should use primaryKey value if hydrated object is passed as a value', () => {
      const store = {
        id: faker.random.uuid(),
        name: `store - ${faker.random.uuid()}`,
      };

      const name = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getUpdateQueryAndParams({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {},
        values: {
          name,
          store,
        },
      });

      query.should.equal(`UPDATE "${productSchema.tableName}" SET "name"=$1,"store_id"=$2 RETURNING "id","name","sku","store_id" AS "store","created_at" AS "createdAt"`);
      params.should.deep.equal([
        name,
        store.id,
      ]);
    });
    it('should cast value to jsonb if type=json and value is an array', () => {
      // Please see https://github.com/brianc/node-postgres/issues/442 for details of why this is needed
      const schema: ModelSchema = {
        globalId: 'foo',
        tableName: 'foo',
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true,
          },
          name: {
            type: 'string',
            required: true,
            defaultsTo: 'foobar',
          },
          bar: {
            type: 'json',
          },
        },
      };

      const name = faker.random.uuid();
      const bar = [{
        foo: faker.random.uuid(),
      }];

      const {
        query,
        params,
      } = sqlHelper.getUpdateQueryAndParams({
        modelSchemasByGlobalId,
        schema,
        where: {},
        values: {
          name,
          bar,
        },
      });

      query.should.equal(`UPDATE "${schema.tableName}" SET "name"=$1,"bar"=$2::jsonb RETURNING "id","name","bar"`);
      params.should.deep.equal([
        name,
        JSON.stringify(bar),
      ]);
    });
    it('should include where statement if defined', () => {
      const store = {
        id: faker.random.uuid(),
        name: `store - ${faker.random.uuid()}`,
      };

      const name = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getUpdateQueryAndParams({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          store,
        },
        values: {
          name,
        },
      });

      query.should.equal(`UPDATE "${productSchema.tableName}" SET "name"=$1 WHERE "store_id"=$2 RETURNING "id","name","sku","store_id" AS "store","created_at" AS "createdAt"`);
      params.should.deep.equal([
        name,
        store.id,
      ]);
    });
    it('should return records if returnRecords=true', () => {
      const productId = faker.random.uuid();
      const storeId = faker.random.uuid();
      const name = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getUpdateQueryAndParams({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          id: productId,
        },
        values: {
          name,
          store: storeId,
        },
        returnRecords: true,
      });

      query.should.equal(`UPDATE "${productSchema.tableName}" SET "name"=$1,"store_id"=$2 WHERE "id"=$3 RETURNING "id","name","sku","store_id" AS "store","created_at" AS "createdAt"`);
      params.should.deep.equal([
        name,
        storeId,
        productId,
      ]);
    });
    it('should return specific columns for records, if returnRecords=true and returnSelect is defined', () => {
      const productId = faker.random.uuid();
      const storeId = faker.random.uuid();
      const name = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getUpdateQueryAndParams({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          id: productId,
        },
        values: {
          name,
          store: storeId,
        },
        returnRecords: true,
        returnSelect: ['name'],
      });

      query.should.equal(`UPDATE "${productSchema.tableName}" SET "name"=$1,"store_id"=$2 WHERE "id"=$3 RETURNING "name","id"`);
      params.should.deep.equal([
        name,
        storeId,
        productId,
      ]);
    });
    it('should not return records if returnRecords=false', () => {
      const productId = faker.random.uuid();
      const storeId = faker.random.uuid();
      const name = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getUpdateQueryAndParams({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          id: productId,
        },
        values: {
          name,
          store: storeId,
        },
        returnRecords: false,
      });

      query.should.equal(`UPDATE "${productSchema.tableName}" SET "name"=$1,"store_id"=$2 WHERE "id"=$3`);
      params.should.deep.equal([
        name,
        storeId,
        productId,
      ]);
    });
  });
  describe('#getDeleteQueryAndParams()', () => {
    it('should delete all records if no where statement is defined', () => {
      const {
        query,
        params,
      } = sqlHelper.getDeleteQueryAndParams({
        modelSchemasByGlobalId,
        schema: productSchema,
      });

      query.should.equal(`DELETE FROM "${productSchema.tableName}" RETURNING "id","name","sku","store_id" AS "store","created_at" AS "createdAt"`);
      params.should.deep.equal([]);
    });
    it('should include where statement if defined', () => {
      const store = {
        id: faker.random.uuid(),
        name: `store - ${faker.random.uuid()}`,
      };

      const {
        query,
        params,
      } = sqlHelper.getDeleteQueryAndParams({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          store,
        },
      });

      query.should.equal(`DELETE FROM "${productSchema.tableName}" WHERE "store_id"=$1 RETURNING "id","name","sku","store_id" AS "store","created_at" AS "createdAt"`);
      params.should.deep.equal([
        store.id,
      ]);
    });
    it('should return records if returnRecords=true', () => {
      const productId = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getDeleteQueryAndParams({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          id: productId,
        },
        returnRecords: true,
      });

      query.should.equal(`DELETE FROM "${productSchema.tableName}" WHERE "id"=$1 RETURNING "id","name","sku","store_id" AS "store","created_at" AS "createdAt"`);
      params.should.deep.equal([
        productId,
      ]);
    });
    it('should return specific columns for records, if returnRecords=true and returnSelect is defined', () => {
      const productId = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getDeleteQueryAndParams({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          id: productId,
        },
        returnRecords: true,
        returnSelect: ['name'],
      });

      query.should.equal(`DELETE FROM "${productSchema.tableName}" WHERE "id"=$1 RETURNING "name","id"`);
      params.should.deep.equal([
        productId,
      ]);
    });
    it('should not return records if returnRecords=false', () => {
      const productId = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getDeleteQueryAndParams({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          id: productId,
        },
        returnRecords: false,
      });

      query.should.equal(`DELETE FROM "${productSchema.tableName}" WHERE "id"=$1`);
      params.should.deep.equal([
        productId,
      ]);
    });
  });
  describe('#getPrimaryKeyPropertyName()', () => {
    it('should return the first attribute with primaryKey=true', () => {
      const schema: ModelSchema = {
        globalId: faker.random.uuid(),
        attributes: {
          foo: {
            type: 'string',
          },
          bar: {
            type: 'string',
            primaryKey: true,
          },
        },
      };

      const value = sqlHelper.getPrimaryKeyPropertyName({
        schema,
      });

      value.should.equal('bar');
    });
    it('should return id if no attributes are found with primaryKey=true', () => {
      const schema: ModelSchema = {
        globalId: faker.random.uuid(),
        attributes: {
          foo: {
            type: 'string',
          },
        },
      };

      const value = sqlHelper.getPrimaryKeyPropertyName({
        schema,
      });

      value.should.equal('id');
    });
  });
  describe('#_getColumnName()', () => {
    const schema: ModelSchema = {
      globalId: faker.random.uuid(),
      attributes: {
        id: {
          type: 'string',
          primaryKey: true,
        },
        foo: {
          type: 'string',
        },
        bar: {
          type: 'string',
          columnName: 'foobar',
        },
      },
    };

    it('should return columnName value if defined in the schema', () => {
      const result = sqlHelper._getColumnName({
        schema,
        propertyName: 'bar',
      });

      result.should.equal('foobar');
    });
    it('should return propertyName if columnName is not defined in the schema', () => {
      const propertyName = 'foo';
      const result = sqlHelper._getColumnName({
        schema,
        propertyName,
      });

      result.should.equal(propertyName);
    });
    it('should throw if propertyName is not an attribute key in the schema', () => {
      const propertyName = 'foobar';
      (() => {
        sqlHelper._getColumnName({
          schema,
          propertyName,
        });
      }).should.throw(Error, `Property (${propertyName}) not found in model (${schema.globalId}).`);
    });
  });
  describe('#_getColumnsToSelect()', () => {
    it('should include all columns if select is undefined', () => {
      const query = sqlHelper._getColumnsToSelect({
        schema: productSchema,
        select: undefined,
      });

      query.should.equal(`"id","name","sku","store_id" AS "store","created_at" AS "createdAt"`);
    });
    it('should include all columns if select is undefined', () => {
      const query = sqlHelper._getColumnsToSelect({
        schema: productSchema,
      });

      query.should.equal(`"id","name","sku","store_id" AS "store","created_at" AS "createdAt"`);
    });
    it('should include primaryKey column if select is empty', () => {
      const query = sqlHelper._getColumnsToSelect({
        schema: productSchema,
        select: [],
      });

      query.should.equal(`"id"`);
    });
    it('should include primaryKey column if select does not include it', () => {
      const query = sqlHelper._getColumnsToSelect({
        schema: productSchema,
        select: ['name'],
      });

      query.should.equal(`"name","id"`);
    });
  });
  describe('#_buildWhereStatement()', () => {
    it('should return empty if where is undefined', () => {
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
      });

      should.not.exist(whereStatement);
      params.should.deep.equal([]);
    });
    it('should throw if query value is undefined', () => {
      (() => {
        sqlHelper._buildWhereStatement({
          modelSchemasByGlobalId,
          schema: productSchema,
          // @ts-ignore
          where: {
            store: undefined,
          },
        });
      }).should.throw(Error, `Attempting to query with an undefined value. store on ${productSchema.globalId}`);
    });
    it('should use column name if defined', () => {
      const storeId = faker.random.uuid();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          store: storeId,
        },
      });

      whereStatement!.should.equal('WHERE "store_id"=$1');
      params.should.deep.equal([storeId]);
    });
    it('should use property name if columnName is not defined', () => {
      const name = faker.random.uuid();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          name,
        },
      });

      whereStatement!.should.equal('WHERE "name"=$1');
      params.should.deep.equal([name]);
    });
    it('should handle startsWith', () => {
      const name = faker.random.uuid();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          name: {
            startsWith: name,
          },
        },
      });

      whereStatement!.should.equal('WHERE "name" ILIKE $1');
      params.should.deep.equal([`${name}%`]);
    });
    it('should handle startsWith with an array of values', () => {
      const name1 = 'TestUpper';
      const name2 = faker.random.uuid();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          name: {
            startsWith: [name1, name2],
          },
        },
      });

      whereStatement!.should.equal('WHERE lower("name")=ANY($1::TEXT[])');
      params.should.deep.equal([
        [
          `${name1.toLowerCase()}%`,
          `${name2.toLowerCase()}%`,
        ],
      ]);
    });
    it('should handle endsWith', () => {
      const name = faker.random.uuid();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          name: {
            endsWith: name,
          },
        },
      });

      whereStatement!.should.equal('WHERE "name" ILIKE $1');
      params.should.deep.equal([`%${name}`]);
    });
    it('should handle endsWith with an array of values', () => {
      const name1 = 'TestUpper';
      const name2 = faker.random.uuid();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          name: {
            endsWith: [name1, name2],
          },
        },
      });

      whereStatement!.should.equal('WHERE lower("name")=ANY($1::TEXT[])');
      params.should.deep.equal([
        [
          `%${name1.toLowerCase()}`,
          `%${name2.toLowerCase()}`,
        ],
      ]);
    });
    it('should handle contains', () => {
      const name = faker.random.uuid();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          name: {
            contains: name,
          },
        },
      });

      whereStatement!.should.equal('WHERE "name" ILIKE $1');
      params.should.deep.equal([`%${name}%`]);
    });
    it('should handle contains with an array of values', () => {
      const name1 = 'TestUpper';
      const name2 = faker.random.uuid();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          name: {
            contains: [name1, name2],
          },
        },
      });

      whereStatement!.should.equal('WHERE lower("name")=ANY($1::TEXT[])');
      params.should.deep.equal([
        [
          `%${name1.toLowerCase()}%`,
          `%${name2.toLowerCase()}%`,
        ],
      ]);
    });
    it('should handle like', () => {
      const name = faker.random.uuid();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          name: {
            like: name,
          },
        },
      });

      whereStatement!.should.equal('WHERE "name" ILIKE $1');
      params.should.deep.equal([name]);
    });
    it('should handle not like', () => {
      const name = faker.random.uuid();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          name: {
            '!': {
              like: name,
            },
          },
        },
      });

      whereStatement!.should.equal('WHERE "name" NOT ILIKE $1');
      params.should.deep.equal([name]);
    });
    it('should handle like with array with a single value', () => {
      const name = faker.random.uuid();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          name: {
            like: [name],
          },
        },
      });

      whereStatement!.should.equal('WHERE "name" ILIKE $1');
      params.should.deep.equal([name]);
    });
    it('should handle not like with array with a single value', () => {
      const name = faker.random.uuid();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          name: {
            '!': {
              like: [name],
            },
          },
        },
      });

      whereStatement!.should.equal('WHERE "name" NOT ILIKE $1');
      params.should.deep.equal([name]);
    });
    it('should handle like with an array of values', () => {
      const name1 = 'TestUpper';
      const name2 = faker.random.uuid();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          name: {
            like: [name1, name2],
          },
        },
      });

      whereStatement!.should.equal('WHERE lower("name")=ANY($1::TEXT[])');
      params.should.deep.equal([
        [
          name1.toLowerCase(),
          name2.toLowerCase(),
        ],
      ]);
    });
    it('should handle not like with an array of values', () => {
      const name1 = 'TestUpper';
      const name2 = faker.random.uuid();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          name: {
            '!': {
              like: [name1, name2],
            },
          },
        },
      });

      whereStatement!.should.equal('WHERE lower("name")<>ALL($1::TEXT[])');
      params.should.deep.equal([
        [
          name1.toLowerCase(),
          name2.toLowerCase(),
        ],
      ]);
    });
    it('should handle like with an empty array', () => {
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          name: {
            like: [],
          },
        },
      });

      whereStatement!.should.equal('WHERE 1<>1');
      params.should.deep.equal([]);
    });
    it('should handle not like with an empty array', () => {
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          name: {
            '!': {
              like: [],
            },
          },
        },
      });

      whereStatement!.should.equal('WHERE 1=1');
      params.should.deep.equal([]);
    });
    it('should handle date value', () => {
      const now = new Date();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          createdAt: {
            '>': now,
          },
        },
      });

      whereStatement!.should.equal('WHERE "created_at">$1');
      params.should.deep.equal([now]);
    });
    it('should handle or', () => {
      const name = faker.random.uuid();
      const store = faker.random.uuid();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          or: [{
            name,
          }, {
            name: {
              '!': name,
            },
            store,
          }],
        },
      });

      whereStatement!.should.equal('WHERE (("name"=$1) OR ("name"<>$2 AND "store_id"=$3))');
      params.should.deep.equal([name, name, store]);
    });
    it('should handle mixed or/and constraints', () => {
      const id = faker.random.uuid();
      const name = faker.random.uuid();
      const store = faker.random.uuid();
      const sku = faker.random.uuid();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          id,
          or: [{
            name,
          }, {
            name: {
              '!': name,
            },
            store,
          }],
          sku,
        },
      });

      whereStatement!.should.equal('WHERE "id"=$1 AND (("name"=$2) OR ("name"<>$3 AND "store_id"=$4)) AND "sku"=$5');
      params.should.deep.equal([
        id,
        name,
        name,
        store,
        sku,
      ]);
    });
    it('should treat string type with array values as an =ANY() statement', () => {
      const name = [faker.random.uuid(), faker.random.uuid()];
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          name,
        },
      });

      whereStatement!.should.equal('WHERE "name"=ANY($1::TEXT[])');
      params.should.deep.equal([name]);
    });
    it('should treat integer type with array values as an =ANY() statement', () => {
      const schema: ModelSchema = {
        globalId: faker.random.uuid(),
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true,
          },
          foo: {
            type: 'integer',
          },
        },
      };

      const values = [42, 24];

      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId: {
          [schema.globalId]: schema,
        },
        schema,
        where: {
          foo: values,
        },
      });

      whereStatement!.should.equal('WHERE "foo"=ANY($1::INTEGER[])');
      params.should.deep.equal([values]);
    });
    it('should treat float type with array values as an =ANY() statement', () => {
      const schema: ModelSchema = {
        globalId: faker.random.uuid(),
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true,
          },
          foo: {
            type: 'float',
          },
        },
      };

      const values = [42.42, 24.24];

      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId: {
          [schema.globalId]: schema,
        },
        schema,
        where: {
          foo: values,
        },
      });

      whereStatement!.should.equal('WHERE "foo"=ANY($1::NUMERIC[])');
      params.should.deep.equal([values]);
    });
    it('should handle empty array value with array type column', () => {
      const schema: ModelSchema = {
        globalId: faker.random.uuid(),
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true,
          },
          foo: {
            type: 'array',
          },
        },
      };

      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId: {
          [schema.globalId]: schema,
        },
        schema,
        where: {
          foo: [],
        },
      });

      whereStatement!.should.equal('WHERE "foo"=\'{}\'');
      params.should.deep.equal([]);
    });
    it('should handle comparing array type as an array of null or empty', () => {
      const schema: ModelSchema = {
        globalId: faker.random.uuid(),
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true,
          },
          foo: {
            type: 'array',
          },
        },
      };

      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId: {
          [schema.globalId]: schema,
        },
        schema,
        where: {
          foo: [null, []],
        },
      });

      whereStatement!.should.equal('WHERE ("foo" IS NULL OR "foo"=\'{}\')');
      params.should.deep.equal([]);
    });
    it('should handle comparing array type with single value as =ANY()', () => {
      const schema: ModelSchema = {
        globalId: faker.random.uuid(),
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true,
          },
          foo: {
            type: 'array',
          },
        },
      };

      const value = faker.random.uuid();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId: {
          [schema.globalId]: schema,
        },
        schema,
        where: {
          foo: value,
        },
      });

      whereStatement!.should.equal('WHERE $1=ANY("foo")');
      params.should.deep.equal([
        value,
      ]);
    });
    it('should handle comparing array type with negated single value as <>ALL()', () => {
      const schema: ModelSchema = {
        globalId: faker.random.uuid(),
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true,
          },
          foo: {
            type: 'array',
          },
        },
      };

      const value = faker.random.uuid();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId: {
          [schema.globalId]: schema,
        },
        schema,
        where: {
          foo: {
            '!': value,
          },
        },
      });

      whereStatement!.should.equal('WHERE $1<>ALL("foo")');
      params.should.deep.equal([
        value,
      ]);
    });
    it('should handle comparing array type with array value as separate =ANY() statements', () => {
      const schema: ModelSchema = {
        globalId: faker.random.uuid(),
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true,
          },
          foo: {
            type: 'array',
          },
        },
      };

      const values = [
        faker.random.uuid(),
        faker.random.uuid(),
      ];
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId: {
          [schema.globalId]: schema,
        },
        schema,
        where: {
          foo: values,
        },
      });

      whereStatement!.should.equal('WHERE ($1=ANY("foo") OR $2=ANY("foo"))');
      params.should.deep.equal([
        values[0],
        values[1],
      ]);
    });
    it('should handle comparing array type with negated array value as separate <>ALL() statements', () => {
      const schema: ModelSchema = {
        globalId: faker.random.uuid(),
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true,
          },
          foo: {
            type: 'array',
          },
        },
      };

      const values = [
        faker.random.uuid(),
        faker.random.uuid(),
      ];
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId: {
          [schema.globalId]: schema,
        },
        schema,
        where: {
          foo: {
            '!': values,
          },
        },
      });

      whereStatement!.should.equal('WHERE $1<>ALL("foo") AND $2<>ALL("foo")');
      params.should.deep.equal([
        values[0],
        values[1],
      ]);
    });
    it('should treat empty array value as "false"', () => {
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          name: [],
        },
      });

      whereStatement!.should.equal('WHERE 1<>1');
      params.should.deep.equal([]);
    });
    it('should treat negated empty array value as "true"', () => {
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          name: {
            '!': [],
          },
        },
      });

      whereStatement!.should.equal('WHERE 1=1');
      params.should.deep.equal([]);
    });
    it('should handle single value array', () => {
      const name = faker.random.uuid();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          name: [name],
        },
      });

      whereStatement!.should.equal('WHERE "name"=$1');
      params.should.deep.equal([name]);
    });
    it('should handle an array value with NULL explicitly', () => {
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          name: [null, ''],
        },
      });

      whereStatement!.should.equal('WHERE ("name" IS NULL OR "name"=$1)');
      params.should.deep.equal(['']);
    });
    it('should treat negation of array value as an <>ALL() statement', () => {
      const name = [faker.random.uuid(), faker.random.uuid()];
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          name: {
            '!': name,
          },
        },
      });

      whereStatement!.should.equal('WHERE "name"<>ALL($1::TEXT[])');
      params.should.deep.equal([name]);
    });
    it('should treat negation of empty array value as "true"', () => {
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          name: {
            '!': [],
          },
        },
      });

      whereStatement!.should.equal('WHERE 1=1');
      params.should.deep.equal([]);
    });
    it('should treat negation of array value with NULL explicitly as AND statements', () => {
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          name: {
            '!': [null, ''],
          },
        },
      });

      whereStatement!.should.equal('WHERE "name" IS NOT NULL AND "name"<>$1');
      params.should.deep.equal(['']);
    });
    it('should use primaryKey if hydrated object is passed as a query value', () => {
      const store = {
        id: faker.random.uuid(),
      };

      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: {
          store,
        },
      });

      whereStatement!.should.equal('WHERE "store_id"=$1');
      params.should.deep.equal([store.id]);
    });
  });
  describe('#_buildOrderStatement()', () => {
    const schema: ModelSchema = {
      globalId: faker.random.uuid(),
      attributes: {
        id: {
          type: 'integer',
          primaryKey: true,
        },
        foo: {
          type: 'string',
        },
        bar: {
          type: 'string',
          columnName: 'foobar',
        },
      },
    };

    it('should return empty if there are no orders defined', () => {
      const result = sqlHelper._buildOrderStatement({
        schema,
        sorts: [],
      });

      result.should.equal('');
    });
    it('should return empty if there are orders is null', () => {
      const result = sqlHelper._buildOrderStatement({
        schema,
        // @ts-ignore
        sorts: null,
      });

      result.should.equal('');
    });
    it('should handle single string order with implicit direction', () => {
      const result = sqlHelper._buildOrderStatement({
        schema,
        sorts: ['foo'],
      });

      result.should.equal('ORDER BY "foo"');
    });
    it('should handle single string order with implicit direction and explicit columnName', () => {
      const result = sqlHelper._buildOrderStatement({
        schema,
        sorts: ['bar'],
      });

      result.should.equal('ORDER BY "foobar"');
    });
    it('should handle single string order with explicit asc direction', () => {
      const result = sqlHelper._buildOrderStatement({
        schema,
        sorts: ['foo asc'],
      });

      result.should.equal('ORDER BY "foo"');
    });
    it('should handle single string order with explicit asc direction and explicit columnName', () => {
      const result = sqlHelper._buildOrderStatement({
        schema,
        sorts: ['bar asc'],
      });

      result.should.equal('ORDER BY "foobar"');
    });
    it('should handle single string order with explicit desc direction', () => {
      const result = sqlHelper._buildOrderStatement({
        schema,
        sorts: ['foo desc'],
      });

      result.should.equal('ORDER BY "foo" DESC');
    });
    it('should handle single string order with explicit desc direction and explicit columnName', () => {
      const result = sqlHelper._buildOrderStatement({
        schema,
        sorts: ['bar desc'],
      });

      result.should.equal('ORDER BY "foobar" DESC');
    });
    it('should handle multiple string order', () => {
      const result = sqlHelper._buildOrderStatement({
        schema,
        sorts: ['bar desc', 'foo'],
      });

      result.should.equal('ORDER BY "foobar" DESC,"foo"');
    });
    it('should handle single object order with explicit desc direction', () => {
      const result = sqlHelper._buildOrderStatement({
        schema,
        sorts: [{
          foo: -1,
        }],
      });

      result.should.equal('ORDER BY "foo" DESC');
    });
    it('should handle single object order with explicit desc direction and explicit columnName', () => {
      const result = sqlHelper._buildOrderStatement({
        schema,
        sorts: [{
          bar: -1,
        }],
      });

      result.should.equal('ORDER BY "foobar" DESC');
    });
    it('should handle multiple string order', () => {
      const result = sqlHelper._buildOrderStatement({
        schema,
        sorts: [{
          foo: 1,
          bar: -1,
        }],
      });

      result.should.equal('ORDER BY "foo","foobar" DESC');
    });
    it('should handle mixed string and object orders', () => {
      const result = sqlHelper._buildOrderStatement({
        schema,
        sorts: ['foo asc', {
          bar: -1,
        }],
      });

      result.should.equal('ORDER BY "foo","foobar" DESC');
    });
  });
});
