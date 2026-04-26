import { describe, it } from 'vitest';

import type { IReadonlyRepository, IRepository, QueryResult, WhereQuery } from '../src/index.js';
import type { FindOneResult, FindResult } from '../src/query/index.js';

import type { ModelBase } from './models/ModelBase.js';
import type { Product } from './models/Product.js';
import type { SimpleWithJson } from './models/SimpleWithJson.js';
import type { Store } from './models/Store.js';

// Compile-time assignability checks - a type error means variance is broken
function acceptWhereQuery(_where: WhereQuery<ModelBase>): void {}
function acceptReadonlyRepository(_repo: IReadonlyRepository<ModelBase>): void {}
function acceptRepository(_repo: IRepository<ModelBase>): void {}

// Exact-equality helper for type-level assertions. Resolves to `true` only when X and Y are
// structurally identical, so a type error here means the inferred type drifted.
type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
// `T` is consumed by the optional param so lint sees it as used; passing the param is unnecessary.
function assertExact<T extends true>(_check?: T): void {}

describe('Type variance', () => {
  it('should allow WhereQuery<SpecificModel> where WhereQuery<BaseModel> is expected', () => {
    const where: WhereQuery<Product> = { name: 'test' };
    acceptWhereQuery(where);
  });

  it('should allow WhereQuery<ModelWithJsonColumn> where WhereQuery<BaseModel> is expected', () => {
    const where: WhereQuery<SimpleWithJson> = { name: 'test' };
    acceptWhereQuery(where);
  });

  it('should allow IReadonlyRepository<SpecificModel> where IReadonlyRepository<BaseModel> is expected', () => {
    const repo = {} as IReadonlyRepository<Product>;
    acceptReadonlyRepository(repo);
  });

  it('should allow IReadonlyRepository<ModelWithJsonColumn> where IReadonlyRepository<BaseModel> is expected', () => {
    const repo = {} as IReadonlyRepository<SimpleWithJson>;
    acceptReadonlyRepository(repo);
  });

  it('should allow IRepository<SpecificModel> where IRepository<BaseModel> is expected', () => {
    const repo = {} as IRepository<Product>;
    acceptRepository(repo);
  });

  it('should allow IRepository<ModelWithJsonColumn> where IRepository<BaseModel> is expected', () => {
    const repo = {} as IRepository<SimpleWithJson>;
    acceptRepository(repo);
  });
});

// Product.store is `Store | number`. After `.select(['store'])` the result must reflect what
// SQL actually returns: the foreign-key primitive, never the populated `Store` instance.
// This caught a real bug where `.select()` returned `Pick<T, K>` (carrying `Store | number`)
// instead of `Pick<QueryResult<T>, K>` (yielding just `number`).
//
// These checks run at compile time only. The function is never invoked at runtime (the repo
// values are empty objects with the wrong shape), but tsgo still type-checks the body. Any
// drift in `.select()`'s return type or constraints produces a compile error here.
async function _selectReturnTypeChecks(productRepo: IRepository<Product>, storeRepo: IRepository<Store>): Promise<void> {
  // findOne().select() — entity ref column becomes the FK primitive in the result.
  {
    const result = await productRepo.findOne({}).select(['name', 'store']);
    type Actual = typeof result;
    type Expected = Pick<QueryResult<Product>, 'name' | 'store'> | null;
    assertExact<Equals<Actual, Expected>>();
  }

  // find().select() — same shape, wrapped in array.
  {
    const result = await productRepo.find({}).select(['store']);
    type Actual = typeof result;
    type Expected = Pick<QueryResult<Product>, 'store'>[];
    assertExact<Equals<Actual, Expected>>();
  }

  // Direct assignability against the result interfaces — any drift in the generic produces
  // a compile error here.
  {
    const findOneSelect: FindOneResult<Product, Pick<QueryResult<Product>, 'name'>> = productRepo.findOne({}).select(['name']);
    const findSelect: FindResult<Product, Pick<QueryResult<Product>, 'name'>> = productRepo.find({}).select(['name']);
    void findOneSelect;
    void findSelect;
  }

  // toJSON() after select() preserves the QueryResult-flavored shape.
  {
    const findOneJson = await productRepo.findOne({}).select(['store']).toJSON();
    const findJson = await productRepo.find({}).select(['store']).toJSON();
    if (findOneJson !== null) {
      const storeFk: number = findOneJson.store;
      void storeFk;
    }
    const firstStoreFk: number | undefined = findJson[0]?.store;
    void firstStoreFk;
  }

  // select() rejects collection-typed properties — selecting them makes no sense (no SQL
  // column) and they are stripped from QueryResult.
  // @ts-expect-error - 'categories' is a collection and must not be selectable
  productRepo.find({}).select(['categories']);
  // @ts-expect-error - same constraint on findOne
  productRepo.findOne({}).select(['categories']);
  // @ts-expect-error - and on Store.products (the inverse side)
  storeRepo.find({}).select(['products']);

  // select() then populate() composes: the populated property must be assignable to Store,
  // not the FK primitive.
  {
    const [row] = await productRepo.find({}).select(['name', 'store']).populate('store');
    if (row) {
      const storeId: number = row.store.id;
      const storeName: string | undefined = row.store.name;
      // `name` (a primitive column) keeps its narrowed type from the select.
      const productName: string = row.name;
      void storeId;
      void storeName;
      void productName;
    }
  }

  // Regression guard: `.select()` alone must NOT carry the Store entity. Pre-fix, the union
  // `Store | number` survived and a Store instance was accepted at the call site.
  {
    const result = await productRepo.findOne({}).select(['store']);
    if (result) {
      const fk: number = result.store;
      // @ts-expect-error - `store` after select() must NOT carry the Store entity
      const asStore: Store = result.store;
      void fk;
      void asStore;
    }
  }
}

describe('select() return type', () => {
  it('compile-time checks for select() return type and select+populate composition', () => {
    // The actual type assertions live in `_selectReturnTypeChecks` above. tsgo verifies them
    // during `npm run check:types`; this test exists so vitest reports the suite passing and
    // surfaces any failure in test output.
    void _selectReturnTypeChecks;
  });
});
