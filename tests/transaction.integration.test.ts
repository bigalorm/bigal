import assert from 'node:assert';
import { setTimeout } from 'node:timers/promises';

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Pool } from 'postgres-pool';

import { initialize, type Repository, transaction } from '../src/index.js';

import { TransactionAccount } from './integrationModels/TransactionAccount.js';
import { TransactionItem } from './integrationModels/TransactionItem.js';
import { getAccountTable, getItemTable } from './integrationModels/transactionTableNames.js';

const DATABASE_URL = process.env.BIGAL_TEST_DATABASE_URL;
const ACCOUNT_TABLE = getAccountTable();
const ITEM_TABLE = getItemTable();

interface ErrorWithCode {
  code: string;
}

function hasErrorCode(error: unknown): error is ErrorWithCode {
  return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string';
}

describe.skipIf(!DATABASE_URL)('managed transactions against PostgreSQL', () => {
  let pool: Pool;
  let AccountRepository: Repository<TransactionAccount>;
  let ItemRepository: Repository<TransactionItem>;

  beforeAll(async () => {
    if (!DATABASE_URL) {
      throw new Error('BIGAL_TEST_DATABASE_URL is required for PostgreSQL integration tests');
    }

    pool = new Pool({
      connectionString: DATABASE_URL,
      poolSize: 8,
    });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${ACCOUNT_TABLE}" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "capacity" INTEGER NOT NULL
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${ITEM_TABLE}" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "account_id" INTEGER NOT NULL REFERENCES "${ACCOUNT_TABLE}"("id")
      )
    `);

    const repositories = initialize({ models: [TransactionAccount, TransactionItem], pool });
    AccountRepository = repositories.TransactionAccount as Repository<TransactionAccount>;
    ItemRepository = repositories.TransactionItem as Repository<TransactionItem>;
  });

  beforeEach(async () => {
    await pool.query(`TRUNCATE TABLE "${ITEM_TABLE}", "${ACCOUNT_TABLE}" RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    await pool.query(`DROP TABLE IF EXISTS "${ITEM_TABLE}"`);
    await pool.query(`DROP TABLE IF EXISTS "${ACCOUNT_TABLE}"`);
    await pool.end();
  });

  it('rejects with the fatal idle timeout and leaves the pool usable', async () => {
    assert(DATABASE_URL);
    const timeoutPool = new Pool({ connectionString: DATABASE_URL, poolSize: 1 });
    const onPoolError = vi.fn<(error: Error) => void>();
    timeoutPool.on('error', onPoolError);

    try {
      const operation = transaction({ pool: timeoutPool, repositories: {}, idleInTransactionTimeoutMs: 100 }, async () => {
        await setTimeout(250);
      });

      await expect(operation).rejects.toMatchObject({ code: '25P03' });
      expect(onPoolError).toHaveBeenCalled();
      await expect(timeoutPool.query('SELECT 1 AS value')).resolves.toMatchObject({ rows: [{ value: 1 }] });
    } finally {
      await timeoutPool.end();
    }
  });

  it('commits dependent writes and reads populated data on the transaction connection', async () => {
    const result = await transaction(
      {
        pool,
        repositories: { Account: AccountRepository, Item: ItemRepository },
      },
      async (transactionScope) => {
        const account = await transactionScope.repositories.Account.create({ name: 'Warehouse', capacity: 2 });
        const item = await transactionScope.repositories.Item.create({ name: 'Widget', account: account.id });
        return transactionScope.repositories.Item.findOne({ id: item.id }).populate('account');
      },
    );

    expect(result?.account).toMatchObject({ name: 'Warehouse', capacity: 2 });
    await expect(ItemRepository.count()).resolves.toBe(1);
  });

  it('rolls back writes when the callback fails', async () => {
    const callbackError = new Error('cancel transaction');

    await expect(
      transaction(
        {
          pool,
          repositories: { Account: AccountRepository },
        },
        async (transactionScope) => {
          await transactionScope.repositories.Account.create({ name: 'Rolled back', capacity: 1 });
          throw callbackError;
        },
      ),
    ).rejects.toBe(callbackError);

    await expect(AccountRepository.count()).resolves.toBe(0);
  });

  it('supports nowait and skip-locked behavior across independent connections', async () => {
    const [lockedAccount, availableAccount] = await AccountRepository.create([
      { name: 'Locked', capacity: 1 },
      { name: 'Available', capacity: 1 },
    ]);
    assert(lockedAccount);
    assert(availableAccount);
    const lockAcquired = Promise.withResolvers<void>();
    const releaseLock = Promise.withResolvers<void>();

    const holdingTransaction = transaction({ pool, repositories: { Account: AccountRepository } }, async (transactionScope) => {
      await transactionScope.repositories.Account.findOne({ id: lockedAccount.id }).lock('update');
      lockAcquired.resolve();
      await releaseLock.promise;
    });

    await lockAcquired.promise;

    try {
      const nowaitOperation = transaction({ pool, repositories: { Account: AccountRepository } }, async (transactionScope) =>
        transactionScope.repositories.Account.findOne({ id: lockedAccount.id }).lock('update', { wait: 'nowait' }),
      );
      await expect(nowaitOperation).rejects.toMatchObject({ code: '55P03' });

      const availableRows = await transaction({ pool, repositories: { Account: AccountRepository } }, async (transactionScope) =>
        transactionScope.repositories.Account.find({ sort: 'id' }).lock('update', { wait: 'skipLocked' }),
      );
      expect(availableRows.map(({ id }) => id)).toStrictEqual([availableAccount.id]);
    } finally {
      releaseLock.resolve();
      await holdingTransaction;
    }
  });

  it('rolls back and preserves SQLSTATE when a lock timeout expires', async () => {
    const account = await AccountRepository.create({ name: 'Locked', capacity: 1 });
    const lockAcquired = Promise.withResolvers<void>();
    const releaseLock = Promise.withResolvers<void>();

    const holdingTransaction = transaction({ pool, repositories: { Account: AccountRepository } }, async (transactionScope) => {
      await transactionScope.repositories.Account.findOne({ id: account.id }).lock('update');
      lockAcquired.resolve();
      await releaseLock.promise;
    });

    await lockAcquired.promise;

    try {
      const waitingTransaction = transaction(
        {
          pool,
          repositories: { Account: AccountRepository },
          lockTimeoutMs: 100,
        },
        async (transactionScope) => transactionScope.repositories.Account.findOne({ id: account.id }).lock('update'),
      );

      await expect(waitingTransaction).rejects.toMatchObject({ code: '55P03' });
    } finally {
      releaseLock.resolve();
      await holdingTransaction;
    }
  });

  it('rolls back a deadlock victim while allowing the other transaction to finish', async () => {
    const [firstAccount, secondAccount] = await AccountRepository.create([
      { name: 'First', capacity: 1 },
      { name: 'Second', capacity: 1 },
    ]);
    assert(firstAccount);
    assert(secondAccount);
    const firstTransactionLocked = Promise.withResolvers<void>();
    const secondTransactionLocked = Promise.withResolvers<void>();

    const firstTransaction = transaction({ pool, repositories: { Account: AccountRepository } }, async (transactionScope) => {
      await transactionScope.repositories.Account.findOne({ id: firstAccount.id }).lock('update');
      firstTransactionLocked.resolve();
      await secondTransactionLocked.promise;
      await transactionScope.repositories.Account.findOne({ id: secondAccount.id }).lock('update');
    });
    const secondTransaction = transaction({ pool, repositories: { Account: AccountRepository } }, async (transactionScope) => {
      await transactionScope.repositories.Account.findOne({ id: secondAccount.id }).lock('update');
      secondTransactionLocked.resolve();
      await firstTransactionLocked.promise;
      await transactionScope.repositories.Account.findOne({ id: firstAccount.id }).lock('update');
    });

    const results = await Promise.allSettled([firstTransaction, secondTransaction]);
    const failures = results.filter((result) => result.status === 'rejected');
    const successes = results.filter((result) => result.status === 'fulfilled');

    expect(failures).toHaveLength(1);
    expect(successes).toHaveLength(1);
    expect(failures.some((failure) => hasErrorCode(failure.reason) && failure.reason.code === '40P01')).toBe(true);
  }, 15_000);

  it('serializes capacity checks when every writer follows the parent-lock protocol', async () => {
    const account = await AccountRepository.create({ name: 'One slot', capacity: 1 });

    async function addItemIfCapacityAllows(name: string): Promise<boolean> {
      return transaction({ pool, repositories: { Account: AccountRepository, Item: ItemRepository } }, async (transactionScope) => {
        const lockedAccount = await transactionScope.repositories.Account.findOne({ id: account.id }).lock('noKeyUpdate');
        if (!lockedAccount) {
          throw new Error('Account disappeared');
        }

        const itemCount = await transactionScope.repositories.Item.count({ account: lockedAccount.id });
        if (itemCount >= lockedAccount.capacity) {
          return false;
        }

        await transactionScope.repositories.Item.create({ name, account: lockedAccount.id });
        return true;
      });
    }

    const outcomes = await Promise.all([addItemIfCapacityAllows('First contender'), addItemIfCapacityAllows('Second contender')]);

    expect(outcomes.filter(Boolean)).toHaveLength(1);
    await expect(ItemRepository.count()).resolves.toBe(1);
  });
});
