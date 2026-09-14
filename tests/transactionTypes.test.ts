import { describe, expectTypeOf, it } from 'vitest';
import { type Pool as PostgresPool } from 'postgres-pool';

import { type DoNotReturnRecords, type PoolLike, type QueryResult, type ReadonlyRepository, type Repository, type TransactionPool, type TransactionScope, type UpdateResult } from '../src/index.js';
import { transaction } from '../src/index.js';
import { type OnConflictOptions } from '../src/query/OnConflictOptions.js';

import { type Product, type ReadonlyProduct } from './models/index.js';

type Equals<TLeft, TRight> = (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2 ? true : false;

function assertExact<TCheck extends true>(_check?: TCheck): void {}

function _postgresPoolCompatibility(pool: PostgresPool): TransactionPool {
  return pool;
}

async function _transactionTypeChecks(pool: TransactionPool, productRepository: Repository<Product>, readonlyProductRepository: ReadonlyRepository<ReadonlyProduct>): Promise<void> {
  const selectedProduct = await transaction(
    {
      pool,
      repositories: {
        inventory: productRepository,
        readonlyInventory: readonlyProductRepository,
      },
    },
    (transactionScope) => {
      const compatiblePool: PoolLike = transactionScope;
      const updateResult: UpdateResult<Product> = transactionScope.repositories.inventory.update({ id: 42 }, { name: 'Widget' });
      void compatiblePool;
      void updateResult;

      // @ts-expect-error - read-only scoped repositories do not expose write methods
      transactionScope.repositories.readonlyInventory.create;
      // @ts-expect-error - custom repository keys remain exact
      transactionScope.repositories.missing;

      return transactionScope.repositories.inventory.findOne().select(['name']);
    },
  );

  type Actual = typeof selectedProduct;
  type Expected = Pick<QueryResult<Product>, 'name'> | null;
  assertExact<Equals<Actual, Expected>>();

  const createdProducts = await transaction({ pool, repositories: { productRepository } }, (transactionScope) =>
    transactionScope.repositories.productRepository.create([
      { name: 'One', store: 1 },
      { name: 'Two', store: 1 },
    ]),
  );
  assertExact<Equals<typeof createdProducts, QueryResult<Product>[]>>();

  const noResult = await transaction({ pool, repositories: { productRepository } }, (transactionScope) =>
    transactionScope.repositories.productRepository.update({ id: 42 }, { name: 'Updated' }, { returnRecords: false }),
  );
  assertExact<Equals<typeof noResult, void>>();
}

function _transactionScopeIsPoolLike(transactionScope: TransactionScope<{ productRepository: Repository<Product> }>): PoolLike {
  return transactionScope;
}

async function _writeOptionTypeChecks(pool: PoolLike, productRepository: Repository<Product>, forwardedOptions: DoNotReturnRecords & Partial<OnConflictOptions<Product>>): Promise<void> {
  const forwardedResult = await productRepository.create({ name: 'Widget', store: 1 }, forwardedOptions);
  assertExact<Equals<typeof forwardedResult, void>>();

  const reusableOptions = { pool, returnRecords: false as const };
  const reusableResult = await productRepository.create({ name: 'Widget', store: 1 }, reusableOptions);
  assertExact<Equals<typeof reusableResult, void>>();

  const bulkResult = await productRepository.create([{ name: 'Widget', store: 1 }], reusableOptions);
  assertExact<Equals<typeof bulkResult, void>>();

  const createdProduct = await productRepository.create({ name: 'Widget', store: 1 }, { pool, onConflict: { action: 'ignore', targets: ['sku'] } });
  assertExact<Equals<typeof createdProduct, QueryResult<Product>>>();

  const destroyResult = await productRepository.destroy({ id: 42 }, { pool });
  assertExact<Equals<typeof destroyResult, void>>();

  expectTypeOf(productRepository.find({ pool }).withCount()).not.toHaveProperty('lock');
}

describe('transaction types', () => {
  it('preserves repository keys, capabilities, selections, and callback results', () => {
    expectTypeOf(_transactionTypeChecks).toBeFunction();
    expectTypeOf(_postgresPoolCompatibility).toBeFunction();
    expectTypeOf(_transactionScopeIsPoolLike).toBeFunction();
  });

  it('keeps returnRecords false on the void overloads when options are not object literals', () => {
    expectTypeOf(_writeOptionTypeChecks).toBeFunction();
  });
});
