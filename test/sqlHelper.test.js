'use strict';

const _ = require('lodash');
const faker = require('faker');
const chai = require('chai');

const should = chai.should();

const sqlHelper = require('../lib/sqlHelper');

describe('sqlHelper', () => {
  const storeSchema = {
    globalId: 'store',
    tableName: 'store',
    attributes: {
      id: {
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
  const productSchema = {
    globalId: 'product',
    tableName: 'product',
    attributes: {
      id: {
        primaryKey: true,
      },
      name: {
        type: 'string',
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
    },
  };
  const categorySchema = {
    globalId: 'category',
    tableName: 'category',
    attributes: {
      id: {
        primaryKey: true,
      },
      name: {
        type: 'string',
      },
    },
  };
  const productCategorySchema = {
    globalId: 'productCategory',
    tableName: 'product__category',
    junctionTable: true,
    attributes: {
      id: {
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
  const modelSchemasByGlobalId = _.keyBy(schemas, (schema) => {
    return schema.globalId.toLowerCase();
  });

  describe("#getPrimaryKeyPropertyName()", () => {
    it('should return the first attribute with primaryKey=true', () => {
      const value = sqlHelper.getPrimaryKeyPropertyName({
        schema: {
          attributes: {
            foo: {},
            bar: {
              primaryKey: true,
            },
          },
        },
      });

      value.should.equal('bar');
    });
    it('should return id if no attributes are found with primaryKey=true', () => {
      const value = sqlHelper.getPrimaryKeyPropertyName({
        schema: {
          attributes: {
            foo: {},
          },
        },
      });

      value.should.equal('id');
    });
  });
  describe('#_getColumnName()', () => {
    const schema = {
      globalId: faker.random.uuid(),
      attributes: {
        id: {
          primaryKey: true,
        },
        foo: {},
        bar: {
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
  describe('#_buildWhereStatement()', () => {
    it('should return empty if where is null', () => {
      const {
        whereStatement,
        params,
      } = sqlHelper._buildWhereStatement({
        modelSchemasByGlobalId,
        schema: productSchema,
        where: null,
      });

      should.not.exist(whereStatement);
      params.should.deep.equal([]);
    });
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

      whereStatement.should.equal('where "store_id"=$1');
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

      whereStatement.should.equal('where "name"=$1');
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

      whereStatement.should.equal('where "name" ILIKE $1');
      params.should.deep.equal([`${name}%`]);
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

      whereStatement.should.equal('where "name" ILIKE $1');
      params.should.deep.equal([`%${name}`]);
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

      whereStatement.should.equal('where "name" ILIKE $1');
      params.should.deep.equal([`%${name}%`]);
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

      whereStatement.should.equal('where "name" ILIKE $1');
      params.should.deep.equal([name]);
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

      whereStatement.should.equal('where (("name"=$1) OR ("name"<>$2 AND "store_id"=$3))');
      params.should.deep.equal([name, name, store]);
    });
    it('should treat arrays as an =ANY() statement', () => {
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

      whereStatement.should.equal('where "name"=ANY($1)');
      params.should.deep.equal([name]);
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

      whereStatement.should.equal('where "name"=$1');
      params.should.deep.equal([name]);
    });
    it('should handle an array with NULL explicitly', () => {
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

      whereStatement.should.equal('where ("name" IS NULL OR "name"=$1)');
      params.should.deep.equal(['']);
    });
    it('should treat negation of array as an <>ALL() statement', () => {
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

      whereStatement.should.equal('where "name"<>ALL($1)');
      params.should.deep.equal([name]);
    });
    it('should treat negation of array with NULL explicitly as AND statements', () => {
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

      whereStatement.should.equal('where "name" IS NOT NULL AND "name"<>$1');
      params.should.deep.equal(['']);
    });
    it('should a hydrated query value', () => {
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

      whereStatement.should.equal('where "store_id"=$1');
      params.should.deep.equal([store.id]);
    });
  });
  describe('#_buildOrderStatement()', () => {
    const schema = {
      globalId: faker.random.uuid(),
      attributes: {
        id: {
          primaryKey: true,
        },
        foo: {},
        bar: {
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
