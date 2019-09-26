import chai from 'chai';
import * as faker from 'faker';

import * as sqlHelper from '../src/SqlHelper';
import {RepositoriesByModelNameLowered} from "../src/RepositoriesByModelNameLowered";
import {initialize, Entity, Repository} from "../src";
import {Pool} from "postgres-pool";
import {mock} from "ts-mockito";
import {ColumnCollectionMetadata, ColumnTypeMetadata, ModelMetadata} from "../src/metadata";
import {
  Category,
  Product,
  ProductCategory,
  ProductWithCreateUpdateDateTracking,
  ReadonlyProduct,
  Store,
} from "./models";

describe('sqlHelper', () => {
  let should: Chai.Should;
  const mockedPool: Pool = mock(Pool);
  let repositoriesByModelNameLowered: RepositoriesByModelNameLowered;

  class TestEntity implements Entity {
  }

  before(() => {
    should = chai.should();
    repositoriesByModelNameLowered = initialize({
      models: [
        Category,
        Product,
        ProductCategory,
        ProductWithCreateUpdateDateTracking,
        ReadonlyProduct,
        Store,
      ],
      pool: mockedPool,
    })
  });

  describe('#getSelectQueryAndParams()', () => {
    describe('select', () => {
      it.only('should include all columns if select is undefined', () => {
        const {
          query,
          params,
        } = sqlHelper.getSelectQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered['product'].model,
          where: {},
          sorts: [],
          limit: 1,
          skip: 0,
        });

        query.should.equal(`SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt" FROM "${repositoriesByModelNameLowered['product'].model.tableName}" LIMIT 1`);
        params.should.deep.equal([]);
      });
      it('should include primaryKey column if select is empty', () => {
        const {
          query,
          params,
        } = sqlHelper.getSelectQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered['product'].model,
          select: [],
          where: {},
          sorts: [],
          limit: 1,
          skip: 0,
        });

        query.should.equal(`SELECT "id" FROM "${repositoriesByModelNameLowered['product'].model.tableName}" LIMIT 1`);
        params.should.deep.equal([]);
      });
      it('should include primaryKey column if select does not include it', () => {
        const {
          query,
          params,
        } = sqlHelper.getSelectQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered['product'].model,
          select: ['name'],
          where: {},
          sorts: [],
          limit: 1,
          skip: 0,
        });

        query.should.equal(`SELECT "name","id" FROM "${repositoriesByModelNameLowered['product'].model.tableName}" LIMIT 1`);
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
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered['product'].model,
          where: {
            name,
          },
          sorts: [],
          limit: 1,
          skip: 0,
        });

        query.should.equal(`SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt" FROM "${repositoriesByModelNameLowered['product'].model.tableName}" WHERE "name"=$1 LIMIT 1`);
        params.should.deep.equal([name]);
      });
    });
    describe('sorts', () => {
      it('should include order by statement if defined', () => {
        const {
          query,
          params,
        } = sqlHelper.getSelectQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered['product'].model,
          sorts: ['name'],
          where: {},
          limit: 1,
          skip: 0,
        });

        query.should.equal(`SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt" FROM "${repositoriesByModelNameLowered['product'].model.tableName}" ORDER BY "name" LIMIT 1`);
        params.should.deep.equal([]);
      });
    });
    describe('skip', () => {
      it('should include OFFSET statement if skip is a number', () => {
        const {
          query,
          params,
        } = sqlHelper.getSelectQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered['product'].model,
          where: {},
          sorts: [],
          limit: 1,
          skip: 100,
        });

        query.should.equal(`SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt" FROM "${repositoriesByModelNameLowered['product'].model.tableName}" LIMIT 1 OFFSET 100`);
        params.should.deep.equal([]);
      });
    });
    describe('limit', () => {
      it('should include LIMIT statement if limit is a number', () => {
        const {
          query,
          params,
        } = sqlHelper.getSelectQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered['product'].model,
          where: {},
          sorts: [],
          skip: 0,
          limit: 100,
        });

        query.should.equal(`SELECT "id","name","sku","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt" FROM "${repositoriesByModelNameLowered['product'].model.tableName}" LIMIT 100`);
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
      });

      query.should.equal(`SELECT count(*) AS "count" FROM "${repositoriesByModelNameLowered['product'].model.tableName}"`);
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
        where: {
          store,
        },
      });

      query.should.equal(`SELECT count(*) AS "count" FROM "${repositoriesByModelNameLowered['product'].model.tableName}" WHERE "store_id"=$1`);
      params.should.deep.equal([
        store.id,
      ]);
    });
  });
  describe('#getInsertQueryAndParams()', () => {
    it('should throw if a required property has an undefined value', () => {
      (() => {
        sqlHelper.getInsertQueryAndParams({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered['product'].model,
          values: {
            store: faker.random.uuid(),
          },
          returnRecords: true,
        });
      }).should.throw(Error, `Create statement for "${repositoriesByModelNameLowered['product'].model.name}" is missing value for required field: name`);
    });
    it('should not throw if a required property has a defaultValue and an undefined initial value', () => {
      const model = new ModelMetadata({
        name: 'foo',
        type: TestEntity,
      });
      model.columns = [
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'id',
          propertyName: 'id',
          primary: true,
          type: 'integer',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'name',
          propertyName: 'name',
          required: true,
          defaultsTo: 'foobar',
          type: 'string',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'bar',
          propertyName: 'bar',
          type: 'string',
        }),
      ];
      const repositories: RepositoriesByModelNameLowered = {};
      repositories[model.name.toLowerCase()] = new Repository({
        modelMetadata: model,
        type: model.type,
        pool: mockedPool,
        repositoriesByModelNameLowered: repositories,
      });

      (() => {
        sqlHelper.getInsertQueryAndParams({
          repositoriesByModelNameLowered: repositories,
          model,
          values: {
            bar: faker.random.uuid(),
          },
          returnRecords: true,
        });
      }).should.not.throw();
    });
    it('should not override properties with defaultValue if value is defined', () => {
      const model = new ModelMetadata({
        name: 'foo',
        type: TestEntity,
      });
      model.columns = [
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'id',
          propertyName: 'id',
          primary: true,
          type: 'integer',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'name',
          propertyName: 'name',
          defaultsTo: 'foobar',
          type: 'string',
        }),
      ];
      const repositories: RepositoriesByModelNameLowered = {};
      repositories[model.name.toLowerCase()] = new Repository({
        modelMetadata: model,
        type: model.type,
        pool: mockedPool,
        repositoriesByModelNameLowered: repositories,
      });

      const name = faker.random.uuid();
      const {
        params,
      } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered: repositories,
        model,
        values: {
          name,
        },
        returnRecords: true,
      });

      params.should.deep.equal([name]);
    });
    it('should set undefined properties to defaultValue if defined on schema', () => {
      const model = new ModelMetadata({
        name: 'foo',
        type: TestEntity,
      });
      model.columns = [
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'id',
          propertyName: 'id',
          primary: true,
          type: 'integer',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'name',
          propertyName: 'name',
          defaultsTo: 'foobar',
          type: 'string',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'bar',
          propertyName: 'bar',
          type: 'string',
        }),
      ];
      const repositories: RepositoriesByModelNameLowered = {};
      repositories[model.name.toLowerCase()] = new Repository({
        modelMetadata: model,
        type: model.type,
        pool: mockedPool,
        repositoriesByModelNameLowered: repositories,
      });

      const bar = faker.random.uuid();
      const {
        params,
      } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered: repositories,
        model,
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
      const model = new ModelMetadata({
        name: 'foo',
        type: TestEntity,
      });
      model.columns = [
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'id',
          propertyName: 'id',
          primary: true,
          type: 'integer',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'name',
          propertyName: 'name',
          defaultsTo: () => 'foobar',
          type: 'string',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'bar',
          propertyName: 'bar',
          type: 'string',
        }),
      ];
      const repositories: RepositoriesByModelNameLowered = {};
      repositories[model.name.toLowerCase()] = new Repository({
        modelMetadata: model,
        type: model.type,
        pool: mockedPool,
        repositoriesByModelNameLowered: repositories,
      });

      const bar = faker.random.uuid();
      const {
        params,
      } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered: repositories,
        model,
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
      const model = new ModelMetadata({
        name: 'foo',
        type: TestEntity,
      });
      model.columns = [
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'id',
          propertyName: 'id',
          primary: true,
          type: 'integer',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'name',
          propertyName: 'name',
          type: 'string',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'created_at',
          propertyName: 'createdAt',
          type: 'datetime',
          createDate: true,
        }),
      ];
      const repositories: RepositoriesByModelNameLowered = {};
      repositories[model.name.toLowerCase()] = new Repository({
        modelMetadata: model,
        type: model.type,
        pool: mockedPool,
        repositoriesByModelNameLowered: repositories,
      });

      const name = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered: repositories,
        model,
        values: {
          name,
        },
      });

      query.should.equal(`INSERT INTO "${model.tableName}" ("name","created_at") VALUES ($1,$2) RETURNING "id","name","created_at" AS "createdAt"`);
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
      const model = new ModelMetadata({
        name: 'foo',
        type: TestEntity,
      });
      model.columns = [
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'id',
          propertyName: 'id',
          primary: true,
          type: 'integer',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'name',
          propertyName: 'name',
          type: 'string',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'created_at',
          propertyName: 'createdAt',
          type: 'datetime',
          createDate: true,
        }),
      ];
      const repositories: RepositoriesByModelNameLowered = {};
      repositories[model.name.toLowerCase()] = new Repository({
        modelMetadata: model,
        type: model.type,
        pool: mockedPool,
        repositoriesByModelNameLowered: repositories,
      });

      const name = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered: repositories,
        model,
        values: {
          name,
          createdAt,
        },
      });

      query.should.equal(`INSERT INTO "${model.tableName}" ("name","created_at") VALUES ($1,$2) RETURNING "id","name","created_at" AS "createdAt"`);
      params.should.deep.equal([
        name,
        createdAt,
      ]);
    });
    it('should set updatedAt if schema.autoUpdatedAt and value is undefined', () => {
      const beforeTime = new Date();
      const model = new ModelMetadata({
        name: 'foo',
        type: TestEntity,
      });
      model.columns = [
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'id',
          propertyName: 'id',
          primary: true,
          type: 'integer',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'name',
          propertyName: 'name',
          type: 'string',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'updated_at',
          propertyName: 'updatedAt',
          type: 'datetime',
          updateDate: true,
        }),
      ];
      const repositories: RepositoriesByModelNameLowered = {};
      repositories[model.name.toLowerCase()] = new Repository({
        modelMetadata: model,
        type: model.type,
        pool: mockedPool,
        repositoriesByModelNameLowered: repositories,
      });

      const name = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered: repositories,
        model,
        values: {
          name,
        },
      });

      query.should.equal(`INSERT INTO "${model.tableName}" ("name","updated_at") VALUES ($1,$2) RETURNING "id","name","updated_at" AS "updatedAt"`);
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
      const model = new ModelMetadata({
        name: 'foo',
        type: TestEntity,
      });
      model.columns = [
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'id',
          propertyName: 'id',
          primary: true,
          type: 'integer',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'name',
          propertyName: 'name',
          type: 'string',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'updated_at',
          propertyName: 'updatedAt',
          type: 'datetime',
          updateDate: true,
        }),
      ];
      const repositories: RepositoriesByModelNameLowered = {};
      repositories[model.name.toLowerCase()] = new Repository({
        modelMetadata: model,
        type: model.type,
        pool: mockedPool,
        repositoriesByModelNameLowered: repositories,
      });

      const name = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered: repositories,
        model,
        values: {
          name,
          updatedAt,
        },
      });

      query.should.equal(`INSERT INTO "${model.tableName}" ("name","updated_at") VALUES ($1,$2) RETURNING "id","name","updated_at" AS "updatedAt"`);
      params.should.deep.equal([
        name,
        updatedAt,
      ]);
    });
    it('should ignore collection properties', () => {
      const model = new ModelMetadata({
        name: 'foo',
        type: TestEntity,
      });
      model.columns = [
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'id',
          propertyName: 'id',
          primary: true,
          type: 'integer',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'name',
          propertyName: 'name',
          type: 'string',
        }),
        new ColumnCollectionMetadata({
          target: 'foo',
          name: 'bars',
          propertyName: 'bars',
          collection: 'bar',
          via: 'foo',
        }),
        new ColumnCollectionMetadata({
          target: 'foo',
          name: 'bats',
          propertyName: 'bats',
          collection: 'bats',
          through: 'foo__bats',
          via: 'foo',
        }),
      ];
      const repositories: RepositoriesByModelNameLowered = {};
      repositories[model.name.toLowerCase()] = new Repository({
        modelMetadata: model,
        type: model.type,
        pool: mockedPool,
        repositoriesByModelNameLowered: repositories,
      });

      const name = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered: repositories,
        model,
        values: {
          name,
          bars: [faker.random.uuid()],
          bats: [faker.random.uuid()],
        },
      });

      query.should.equal(`INSERT INTO "${model.tableName}" ("name") VALUES ($1) RETURNING "id","name"`);
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
        values: {
          name,
          store,
        },
      });

      query.should.equal(`INSERT INTO "${repositoriesByModelNameLowered['product'].model.tableName}" ("name","alias_names","store_id") VALUES ($1,$2,$3) RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt"`);
      params.should.deep.equal([
        name,
        [],
        store.id,
      ]);
    });
    it('should cast value to jsonb if type=json and value is an array', () => {
      // Please see https://github.com/brianc/node-postgres/issues/442 for details of why this is needed
      const model = new ModelMetadata({
        name: 'foo',
        type: TestEntity,
      });
      model.columns = [
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'id',
          propertyName: 'id',
          primary: true,
          type: 'integer',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'name',
          propertyName: 'name',
          type: 'string',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'bar',
          propertyName: 'bar',
          type: 'json',
        }),
      ];
      const repositories: RepositoriesByModelNameLowered = {};
      repositories[model.name.toLowerCase()] = new Repository({
        modelMetadata: model,
        type: model.type,
        pool: mockedPool,
        repositoriesByModelNameLowered: repositories,
      });

      const name = faker.random.uuid();
      const bar = [{
        foo: faker.random.uuid(),
      }];

      const {
        query,
        params,
      } = sqlHelper.getInsertQueryAndParams({
        repositoriesByModelNameLowered: repositories,
        model,
        values: {
          name,
          bar,
        },
      });

      query.should.equal(`INSERT INTO "${model.tableName}" ("name","bar") VALUES ($1,$2::jsonb) RETURNING "id","name","bar"`);
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
        values: {
          name,
          store: storeId,
        },
        returnRecords: true,
      });

      query.should.equal(`INSERT INTO "${repositoriesByModelNameLowered['product'].model.tableName}" ("name","alias_names","store_id") VALUES ($1,$2,$3) RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt"`);
      params.should.deep.equal([
        name,
        [],
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
        values: {
          name,
          store: storeId,
        },
        returnRecords: true,
        returnSelect: ['name'],
      });

      query.should.equal(`INSERT INTO "${repositoriesByModelNameLowered['product'].model.tableName}" ("name","alias_names","store_id") VALUES ($1,$2,$3) RETURNING "name","id"`);
      params.should.deep.equal([
        name,
        [],
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
        values: {
          name,
          store: storeId,
        },
        returnRecords: false,
      });

      query.should.equal(`INSERT INTO "${repositoriesByModelNameLowered['product'].model.tableName}" ("name","alias_names","store_id") VALUES ($1,$2,$3)`);
      params.should.deep.equal([
        name,
        [],
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
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

      query.should.equal(`INSERT INTO "${repositoriesByModelNameLowered['product'].model.tableName}" ("name","alias_names","store_id") VALUES ($1,$3,$5),($2,$4,$6) RETURNING "store_id" AS "store","id"`);
      params.should.deep.equal([
        name1,
        name2,
        [],
        [],
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
        values: [{
          name: name1,
          store: storeId1,
        }, {
          name: name2,
          store: storeId2,
        }],
      });

      query.should.equal(`INSERT INTO "${repositoriesByModelNameLowered['product'].model.tableName}" ("name","alias_names","store_id") VALUES ($1,$3,$5),($2,$4,$6) RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt"`);
      params.should.deep.equal([
        name1,
        name2,
        [],
        [],
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
        values: [{
          name: name1,
          store: storeId1,
        }, {
          name: name2,
          store: storeId2,
        }],
        returnRecords: false,
      });

      query.should.equal(`INSERT INTO "${repositoriesByModelNameLowered['product'].model.tableName}" ("name","alias_names","store_id") VALUES ($1,$3,$5),($2,$4,$6)`);
      params.should.deep.equal([
        name1,
        name2,
        [],
        [],
        storeId1,
        storeId2,
      ]);
    });
  });
  describe('#getUpdateQueryAndParams()', () => {
    it('should not set createdAt if schema.autoCreatedAt and value is undefined', () => {
      const model = new ModelMetadata({
        name: 'foo',
        type: TestEntity,
      });
      model.columns = [
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'id',
          propertyName: 'id',
          primary: true,
          type: 'integer',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'name',
          propertyName: 'name',
          type: 'string',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'created_at',
          propertyName: 'createdAt',
          type: 'datetime',
          createDate: true,
        }),
      ];
      const repositories: RepositoriesByModelNameLowered = {};
      repositories[model.name.toLowerCase()] = new Repository({
        modelMetadata: model,
        type: model.type,
        pool: mockedPool,
        repositoriesByModelNameLowered: repositories,
      });

      const name = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getUpdateQueryAndParams({
        repositoriesByModelNameLowered: repositories,
        model,
        where: {},
        values: {
          name,
        },
      });

      query.should.equal(`UPDATE "${model.tableName}" SET "name"=$1 RETURNING "id","name","created_at" AS "createdAt"`);
      params.should.deep.equal([
        name,
      ]);
    });
    it('should set updatedAt if schema.autoUpdatedAt and value is undefined', () => {
      const beforeTime = new Date();
      const model = new ModelMetadata({
        name: 'foo',
        type: TestEntity,
      });
      model.columns = [
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'id',
          propertyName: 'id',
          primary: true,
          type: 'integer',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'name',
          propertyName: 'name',
          type: 'string',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'updated_at',
          propertyName: 'updatedAt',
          type: 'datetime',
          updateDate: true,
        }),
      ];
      const repositories: RepositoriesByModelNameLowered = {};
      repositories[model.name.toLowerCase()] = new Repository({
        modelMetadata: model,
        type: model.type,
        pool: mockedPool,
        repositoriesByModelNameLowered: repositories,
      });

      const name = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getUpdateQueryAndParams({
        repositoriesByModelNameLowered: repositories,
        model,
        where: {},
        values: {
          name,
        },
      });

      query.should.equal(`UPDATE "${model.tableName}" SET "name"=$1,"updated_at"=$2 RETURNING "id","name","updated_at" AS "updatedAt"`);
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
      const model = new ModelMetadata({
        name: 'foo',
        type: TestEntity,
      });
      model.columns = [
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'id',
          propertyName: 'id',
          primary: true,
          type: 'integer',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'name',
          propertyName: 'name',
          type: 'string',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'updated_at',
          propertyName: 'updatedAt',
          type: 'datetime',
          updateDate: true,
        }),
      ];
      const repositories: RepositoriesByModelNameLowered = {};
      repositories[model.name.toLowerCase()] = new Repository({
        modelMetadata: model,
        type: model.type,
        pool: mockedPool,
        repositoriesByModelNameLowered: repositories,
      });

      const name = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getUpdateQueryAndParams({
        repositoriesByModelNameLowered: repositories,
        model: repositoriesByModelNameLowered['product'].model,
        where: {},
        values: {
          name,
          updatedAt,
        },
      });

      query.should.equal(`UPDATE "${model.tableName}" SET "name"=$1,"updated_at"=$2 RETURNING "id","name","updated_at" AS "updatedAt"`);
      params.should.deep.equal([
        name,
        updatedAt,
      ]);
    });
    it('should ignore collection properties', () => {
      const model = new ModelMetadata({
        name: 'foo',
        type: TestEntity,
      });
      model.columns = [
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'id',
          propertyName: 'id',
          primary: true,
          type: 'integer',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'name',
          propertyName: 'name',
          type: 'string',
        }),
        new ColumnCollectionMetadata({
          target: 'foo',
          name: 'bars',
          propertyName: 'bars',
          collection: 'bar',
          via: 'foo',
        }),
        new ColumnCollectionMetadata({
          target: 'foo',
          name: 'bats',
          propertyName: 'bats',
          collection: 'bats',
          through: 'foo__bats',
          via: 'foo',
        }),
      ];
      const repositories: RepositoriesByModelNameLowered = {};
      repositories[model.name.toLowerCase()] = new Repository({
        modelMetadata: model,
        type: model.type,
        pool: mockedPool,
        repositoriesByModelNameLowered: repositories,
      });

      const name = faker.random.uuid();
      const {
        query,
        params,
      } = sqlHelper.getUpdateQueryAndParams({
        repositoriesByModelNameLowered: repositories,
        model,
        where: {},
        values: {
          name,
          bars: [faker.random.uuid()],
          bats: [faker.random.uuid()],
        },
      });

      query.should.equal(`UPDATE "${model.tableName}" SET "name"=$1 RETURNING "id","name"`);
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
        where: {},
        values: {
          name,
          store,
        },
      });

      query.should.equal(`UPDATE "${repositoriesByModelNameLowered['product'].model.tableName}" SET "name"=$1,"store_id"=$2 RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt"`);
      params.should.deep.equal([
        name,
        store.id,
      ]);
    });
    it('should cast value to jsonb if type=json and value is an array', () => {
      // Please see https://github.com/brianc/node-postgres/issues/442 for details of why this is needed
      const model = new ModelMetadata({
        name: 'foo',
        type: TestEntity,
      });
      model.columns = [
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'id',
          propertyName: 'id',
          primary: true,
          type: 'integer',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'name',
          propertyName: 'name',
          type: 'string',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'bar',
          propertyName: 'bar',
          type: 'json',
        }),
      ];
      const repositories: RepositoriesByModelNameLowered = {};
      repositories[model.name.toLowerCase()] = new Repository({
        modelMetadata: model,
        type: model.type,
        pool: mockedPool,
        repositoriesByModelNameLowered: repositories,
      });

      const name = faker.random.uuid();
      const bar = [{
        foo: faker.random.uuid(),
      }];

      const {
        query,
        params,
      } = sqlHelper.getUpdateQueryAndParams({
        repositoriesByModelNameLowered: repositories,
        model,
        where: {},
        values: {
          name,
          bar,
        },
      });

      query.should.equal(`UPDATE "${model.tableName}" SET "name"=$1,"bar"=$2::jsonb RETURNING "id","name","bar"`);
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
        where: {
          store,
        },
        values: {
          name,
        },
      });

      query.should.equal(`UPDATE "${repositoriesByModelNameLowered['product'].model.tableName}" SET "name"=$1 WHERE "store_id"=$2 RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt"`);
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
        where: {
          id: productId,
        },
        values: {
          name,
          store: storeId,
        },
        returnRecords: true,
      });

      query.should.equal(`UPDATE "${repositoriesByModelNameLowered['product'].model.tableName}" SET "name"=$1,"store_id"=$2 WHERE "id"=$3 RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt"`);
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
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

      query.should.equal(`UPDATE "${repositoriesByModelNameLowered['product'].model.tableName}" SET "name"=$1,"store_id"=$2 WHERE "id"=$3 RETURNING "name","id"`);
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
        where: {
          id: productId,
        },
        values: {
          name,
          store: storeId,
        },
        returnRecords: false,
      });

      query.should.equal(`UPDATE "${repositoriesByModelNameLowered['product'].model.tableName}" SET "name"=$1,"store_id"=$2 WHERE "id"=$3`);
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
      });

      query.should.equal(`DELETE FROM "${repositoriesByModelNameLowered['product'].model.tableName}" RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt"`);
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
        where: {
          store,
        },
      });

      query.should.equal(`DELETE FROM "${repositoriesByModelNameLowered['product'].model.tableName}" WHERE "store_id"=$1 RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt"`);
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
        where: {
          id: productId,
        },
        returnRecords: true,
      });

      query.should.equal(`DELETE FROM "${repositoriesByModelNameLowered['product'].model.tableName}" WHERE "id"=$1 RETURNING "id","name","sku","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt"`);
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
        where: {
          id: productId,
        },
        returnRecords: true,
        returnSelect: ['name'],
      });

      query.should.equal(`DELETE FROM "${repositoriesByModelNameLowered['product'].model.tableName}" WHERE "id"=$1 RETURNING "name","id"`);
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
        where: {
          id: productId,
        },
        returnRecords: false,
      });

      query.should.equal(`DELETE FROM "${repositoriesByModelNameLowered['product'].model.tableName}" WHERE "id"=$1`);
      params.should.deep.equal([
        productId,
      ]);
    });
  });
 describe('#_getColumnsToSelect()', () => {
    it('should include all columns if select is undefined', () => {
      const query = sqlHelper._getColumnsToSelect({
        model: repositoriesByModelNameLowered['product'].model,
        select: undefined,
      });

      query.should.equal('"id","name","sku","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt"');
    });
    it('should include all columns if select is undefined', () => {
      const query = sqlHelper._getColumnsToSelect({
        model: repositoriesByModelNameLowered['product'].model,
      });

      query.should.equal('"id","name","sku","alias_names" AS "aliases","store_id" AS "store","created_at" AS "createdAt"');
    });
    it('should include primaryKey column if select is empty', () => {
      const query = sqlHelper._getColumnsToSelect({
        model: repositoriesByModelNameLowered['product'].model,
        select: [],
      });

      query.should.equal('"id"');
    });
    it('should include primaryKey column if select does not include it', () => {
      const query = sqlHelper._getColumnsToSelect({
        model: repositoriesByModelNameLowered['product'].model,
        select: ['name'],
      });

      query.should.equal('"name","id"');
    });
  });
  describe('#_buildWhereStatement()', () => {
    it('should return empty if where is undefined', () => {
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
      });

      should.not.exist(whereStatement);
      params.should.deep.equal([]);
    });
    it('should throw if query value is undefined', () => {
      (() => {
        sqlHelper._buildWhereStatement({
          repositoriesByModelNameLowered,
          model: repositoriesByModelNameLowered['product'].model,
          // @ts-ignore
          where: {
            store: undefined,
          },
        });
      }).should.throw(Error, `Attempting to query with an undefined value. store on ${repositoriesByModelNameLowered['product'].model.name}`);
    });
    it('should use column name if defined', () => {
      const storeId = faker.random.uuid();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
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
    it('should handle like with an empty value', () => {
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
        where: {
          name: {
            like: '',
          },
        },
      });

      whereStatement!.should.equal('WHERE "name" = \'\'');
      params.should.deep.equal([]);
    });
    it('should handle not like with an empty value', () => {
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
        where: {
          name: {
            '!': {
              like: '',
            },
          },
        },
      });

      whereStatement!.should.equal('WHERE "name" != \'\'');
      params.should.deep.equal([]);
    });
    it('should handle like with array with a single value', () => {
      const name = faker.random.uuid();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
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
    it('should handle like with array column and array with a single value', () => {
      const name = faker.random.uuid();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
        where: {
          aliases: {
            like: [name],
          },
        },
      });

      whereStatement!.should.equal('WHERE EXISTS(SELECT 1 FROM (SELECT unnest("alias_names") AS "unnested_alias_names") __unnested WHERE "unnested_alias_names" ILIKE $1)');
      params.should.deep.equal([name]);
    });
    it('should handle not like with array column and array with a single value', () => {
      const name = faker.random.uuid();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
        where: {
          aliases: {
            '!': {
              like: [name],
            },
          },
        },
      });

      whereStatement!.should.equal('WHERE NOT EXISTS(SELECT 1 FROM (SELECT unnest("alias_names") AS "unnested_alias_names") __unnested WHERE "unnested_alias_names" ILIKE $1)');
      params.should.deep.equal([name]);
    });
    it('should handle like with array column and single value', () => {
      const name = faker.random.uuid();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
        where: {
          aliases: {
            like: name,
          },
        },
      });

      whereStatement!.should.equal('WHERE EXISTS(SELECT 1 FROM (SELECT unnest("alias_names") AS "unnested_alias_names") __unnested WHERE "unnested_alias_names" ILIKE $1)');
      params.should.deep.equal([name]);
    });
    it('should handle not like with array column and a single value', () => {
      const name = faker.random.uuid();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
        where: {
          aliases: {
            '!': {
              like: name,
            },
          },
        },
      });

      whereStatement!.should.equal('WHERE NOT EXISTS(SELECT 1 FROM (SELECT unnest("alias_names") AS "unnested_alias_names") __unnested WHERE "unnested_alias_names" ILIKE $1)');
      params.should.deep.equal([name]);
    });
    it('should handle like with array column and an array of values', () => {
      const name1 = 'TestUpper';
      const name2 = faker.random.uuid();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
        where: {
          aliases: {
            like: [name1, name2],
          },
        },
      });

      whereStatement!.should.equal('WHERE EXISTS(SELECT 1 FROM (SELECT unnest("alias_names") AS "unnested_alias_names") __unnested WHERE lower("unnested_alias_names")=ANY($1::TEXT[]))');
      params.should.deep.equal([
        [
          name1.toLowerCase(),
          name2.toLowerCase(),
        ],
      ]);
    });
    it('should handle not like with array column and an array of values', () => {
      const name1 = 'TestUpper';
      const name2 = faker.random.uuid();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
        where: {
          aliases: {
            '!': {
              like: [name1, name2],
            },
          },
        },
      });

      whereStatement!.should.equal('WHERE EXISTS(SELECT 1 FROM (SELECT unnest("alias_names") AS "unnested_alias_names") __unnested WHERE lower("unnested_alias_names")<>ALL($1::TEXT[]))');
      params.should.deep.equal([
        [
          name1.toLowerCase(),
          name2.toLowerCase(),
        ],
      ]);
    });
    it('should handle date value', () => {
      const now = new Date();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
        where: {
          name,
        },
      });

      whereStatement!.should.equal('WHERE "name"=ANY($1::TEXT[])');
      params.should.deep.equal([name]);
    });
    it('should treat integer type with array values as an =ANY() statement', () => {
      const model = new ModelMetadata({
        name: 'foo',
        type: TestEntity,
      });
      model.columns = [
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'id',
          propertyName: 'id',
          primary: true,
          type: 'integer',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'foo',
          propertyName: 'foo',
          type: 'integer',
        }),
      ];
      const repositories: RepositoriesByModelNameLowered = {};
      repositories[model.name.toLowerCase()] = new Repository({
        modelMetadata: model,
        type: model.type,
        pool: mockedPool,
        repositoriesByModelNameLowered: repositories,
      });

      const values = [42, 24];

      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        repositoriesByModelNameLowered: repositories,
        model,
        where: {
          foo: values,
        },
      });

      whereStatement!.should.equal('WHERE "foo"=ANY($1::INTEGER[])');
      params.should.deep.equal([values]);
    });
    it('should treat float type with array values as an =ANY() statement', () => {
      const model = new ModelMetadata({
        name: 'foo',
        type: TestEntity,
      });
      model.columns = [
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'id',
          propertyName: 'id',
          primary: true,
          type: 'integer',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'foo',
          propertyName: 'foo',
          type: 'float',
        }),
      ];
      const repositories: RepositoriesByModelNameLowered = {};
      repositories[model.name.toLowerCase()] = new Repository({
        modelMetadata: model,
        type: model.type,
        pool: mockedPool,
        repositoriesByModelNameLowered: repositories,
      });

      const values = [42.42, 24.24];

      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        repositoriesByModelNameLowered: repositories,
        model,
        where: {
          foo: values,
        },
      });

      whereStatement!.should.equal('WHERE "foo"=ANY($1::NUMERIC[])');
      params.should.deep.equal([values]);
    });
    it('should handle empty array value with array type column', () => {
      const model = new ModelMetadata({
        name: 'foo',
        type: TestEntity,
      });
      model.columns = [
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'id',
          propertyName: 'id',
          primary: true,
          type: 'integer',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'foo',
          propertyName: 'foo',
          type: 'array',
        }),
      ];
      const repositories: RepositoriesByModelNameLowered = {};
      repositories[model.name.toLowerCase()] = new Repository({
        modelMetadata: model,
        type: model.type,
        pool: mockedPool,
        repositoriesByModelNameLowered: repositories,
      });

      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        repositoriesByModelNameLowered: repositories,
        model,
        where: {
          foo: [],
        },
      });

      whereStatement!.should.equal('WHERE "foo"=\'{}\'');
      params.should.deep.equal([]);
    });
    it('should handle comparing array type as an array of null or empty', () => {
      const model = new ModelMetadata({
        name: 'foo',
        type: TestEntity,
      });
      model.columns = [
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'id',
          propertyName: 'id',
          primary: true,
          type: 'integer',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'foo',
          propertyName: 'foo',
          type: 'array',
        }),
      ];
      const repositories: RepositoriesByModelNameLowered = {};
      repositories[model.name.toLowerCase()] = new Repository({
        modelMetadata: model,
        type: model.type,
        pool: mockedPool,
        repositoriesByModelNameLowered: repositories,
      });

      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        repositoriesByModelNameLowered: repositories,
        model,
        where: {
          foo: [null, []],
        },
      });

      whereStatement!.should.equal('WHERE ("foo" IS NULL OR "foo"=\'{}\')');
      params.should.deep.equal([]);
    });
    it('should handle comparing array type with single value as =ANY()', () => {
      const model = new ModelMetadata({
        name: 'foo',
        type: TestEntity,
      });
      model.columns = [
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'id',
          propertyName: 'id',
          primary: true,
          type: 'integer',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'foo',
          propertyName: 'foo',
          type: 'array',
        }),
      ];
      const repositories: RepositoriesByModelNameLowered = {};
      repositories[model.name.toLowerCase()] = new Repository({
        modelMetadata: model,
        type: model.type,
        pool: mockedPool,
        repositoriesByModelNameLowered: repositories,
      });

      const value = faker.random.uuid();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        repositoriesByModelNameLowered: repositories,
        model,
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
      const model = new ModelMetadata({
        name: 'foo',
        type: TestEntity,
      });
      model.columns = [
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'id',
          propertyName: 'id',
          primary: true,
          type: 'integer',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'foo',
          propertyName: 'foo',
          type: 'array',
        }),
      ];
      const repositories: RepositoriesByModelNameLowered = {};
      repositories[model.name.toLowerCase()] = new Repository({
        modelMetadata: model,
        type: model.type,
        pool: mockedPool,
        repositoriesByModelNameLowered: repositories,
      });

      const value = faker.random.uuid();
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        repositoriesByModelNameLowered: repositories,
        model,
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
      const model = new ModelMetadata({
        name: 'foo',
        type: TestEntity,
      });
      model.columns = [
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'id',
          propertyName: 'id',
          primary: true,
          type: 'integer',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'foo',
          propertyName: 'foo',
          type: 'array',
        }),
      ];
      const repositories: RepositoriesByModelNameLowered = {};
      repositories[model.name.toLowerCase()] = new Repository({
        modelMetadata: model,
        type: model.type,
        pool: mockedPool,
        repositoriesByModelNameLowered: repositories,
      });

      const values = [
        faker.random.uuid(),
        faker.random.uuid(),
      ];
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        repositoriesByModelNameLowered: repositories,
        model,
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
      const model = new ModelMetadata({
        name: 'foo',
        type: TestEntity,
      });
      model.columns = [
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'id',
          propertyName: 'id',
          primary: true,
          type: 'integer',
        }),
        new ColumnTypeMetadata({
          target: 'foo',
          name: 'foo',
          propertyName: 'foo',
          type: 'array',
        }),
      ];
      const repositories: RepositoriesByModelNameLowered = {};
      repositories[model.name.toLowerCase()] = new Repository({
        modelMetadata: model,
        type: model.type,
        pool: mockedPool,
        repositoriesByModelNameLowered: repositories,
      });

      const values = [
        faker.random.uuid(),
        faker.random.uuid(),
      ];
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        repositoriesByModelNameLowered: repositories,
        model,
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
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
        repositoriesByModelNameLowered,
        model: repositoriesByModelNameLowered['product'].model,
        where: {
          store,
        },
      });

      whereStatement!.should.equal('WHERE "store_id"=$1');
      params.should.deep.equal([store.id]);
    });
  });
  describe('#_buildOrderStatement()', () => {
    const model = new ModelMetadata({
      name: 'foo',
      type: TestEntity,
    });
    model.columns = [
      new ColumnTypeMetadata({
        target: 'foo',
        name: 'id',
        propertyName: 'id',
        primary: true,
        type: 'integer',
      }),
      new ColumnTypeMetadata({
        target: 'foo',
        name: 'foo',
        propertyName: 'foo',
        type: 'string',
      }),
      new ColumnTypeMetadata({
        target: 'foo',
        name: 'foobar',
        propertyName: 'bar',
        type: 'string',
      }),
    ];

    it('should return empty if there are no orders defined', () => {
      const result = sqlHelper._buildOrderStatement({
        model,
        sorts: [],
      });

      result.should.equal('');
    });
    it('should return empty if there are orders is null', () => {
      const result = sqlHelper._buildOrderStatement({
        model,
        // @ts-ignore
        sorts: null,
      });

      result.should.equal('');
    });
    it('should handle single string order with implicit direction', () => {
      const result = sqlHelper._buildOrderStatement({
        model,
        sorts: ['foo'],
      });

      result.should.equal('ORDER BY "foo"');
    });
    it('should handle single string order with implicit direction and explicit columnName', () => {
      const result = sqlHelper._buildOrderStatement({
        model,
        sorts: ['bar'],
      });

      result.should.equal('ORDER BY "foobar"');
    });
    it('should handle single string order with explicit asc direction', () => {
      const result = sqlHelper._buildOrderStatement({
        model,
        sorts: ['foo asc'],
      });

      result.should.equal('ORDER BY "foo"');
    });
    it('should handle single string order with explicit asc direction and explicit columnName', () => {
      const result = sqlHelper._buildOrderStatement({
        model,
        sorts: ['bar asc'],
      });

      result.should.equal('ORDER BY "foobar"');
    });
    it('should handle single string order with explicit desc direction', () => {
      const result = sqlHelper._buildOrderStatement({
        model,
        sorts: ['foo desc'],
      });

      result.should.equal('ORDER BY "foo" DESC');
    });
    it('should handle single string order with explicit desc direction and explicit columnName', () => {
      const result = sqlHelper._buildOrderStatement({
        model,
        sorts: ['bar desc'],
      });

      result.should.equal('ORDER BY "foobar" DESC');
    });
    it('should handle multiple string order', () => {
      const result = sqlHelper._buildOrderStatement({
        model,
        sorts: ['bar desc', 'foo'],
      });

      result.should.equal('ORDER BY "foobar" DESC,"foo"');
    });
    it('should handle single object order with explicit desc direction', () => {
      const result = sqlHelper._buildOrderStatement({
        model,
        sorts: [{
          foo: -1,
        }],
      });

      result.should.equal('ORDER BY "foo" DESC');
    });
    it('should handle single object order with explicit desc direction and explicit columnName', () => {
      const result = sqlHelper._buildOrderStatement({
        model,
        sorts: [{
          bar: -1,
        }],
      });

      result.should.equal('ORDER BY "foobar" DESC');
    });
    it('should handle multiple string order', () => {
      const result = sqlHelper._buildOrderStatement({
        model,
        sorts: [{
          foo: 1,
          bar: -1,
        }],
      });

      result.should.equal('ORDER BY "foo","foobar" DESC');
    });
    it('should handle mixed string and object orders', () => {
      const result = sqlHelper._buildOrderStatement({
        model,
        sorts: ['foo asc', {
          bar: -1,
        }],
      });

      result.should.equal('ORDER BY "foo","foobar" DESC');
    });
  });
});
