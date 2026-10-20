import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'postgres-pool';

import { initialize, type Repository, subquery } from '../src/index.js';

import { JoinedFilterProduct } from './integrationModels/JoinedFilterProduct.js';
import { JoinedFilterStore } from './integrationModels/JoinedFilterStore.js';
import { getJoinedFilterProductTable, getJoinedFilterStoreTable } from './integrationModels/joinedFilterTableNames.js';

const DATABASE_URL = process.env.BIGAL_TEST_DATABASE_URL;
const STORE_TABLE = getJoinedFilterStoreTable();
const PRODUCT_TABLE = getJoinedFilterProductTable();
const ACME_OPENED_AT = new Date('2026-01-15T12:00:00Z');
const GLOBEX_OPENED_AT = new Date('2026-03-01T12:00:00Z');

function getNames(products: readonly Pick<JoinedFilterProduct, 'name'>[]): string[] {
  return products.map((product) => product.name);
}

describe.skipIf(!DATABASE_URL)('nested where clauses for joined relationships against PostgreSQL', () => {
  let pool: Pool;
  let StoreRepository: Repository<JoinedFilterStore>;
  let ProductRepository: Repository<JoinedFilterProduct>;

  beforeAll(async () => {
    if (!DATABASE_URL) {
      throw new Error('BIGAL_TEST_DATABASE_URL is required for PostgreSQL integration tests');
    }

    pool = new Pool({
      connectionString: DATABASE_URL,
    });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${STORE_TABLE}" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "manager" TEXT,
        "opened_at" TIMESTAMPTZ NOT NULL
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${PRODUCT_TABLE}" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "kind" TEXT NOT NULL,
        "store_id" INTEGER NOT NULL REFERENCES "${STORE_TABLE}"("id")
      )
    `);

    const repositories = initialize({ models: [JoinedFilterProduct, JoinedFilterStore], pool });
    StoreRepository = repositories.JoinedFilterStore as Repository<JoinedFilterStore>;
    ProductRepository = repositories.JoinedFilterProduct as Repository<JoinedFilterProduct>;

    const managedStore = await StoreRepository.create({ name: 'Acme', manager: 'Ann', openedAt: ACME_OPENED_AT });
    const unmanagedStore = await StoreRepository.create({ name: 'Globex', manager: null, openedAt: GLOBEX_OPENED_AT });
    await ProductRepository.create([
      { name: 'Acme crew', kind: 'crew', store: managedStore.id },
      { name: 'Acme dm', kind: 'dm', store: managedStore.id },
      { name: 'Globex channel', kind: 'channel', store: unmanagedStore.id },
      { name: 'Globex crew', kind: 'crew', store: unmanagedStore.id },
    ]);
  });

  afterAll(async () => {
    await pool.query(`DROP TABLE IF EXISTS "${PRODUCT_TABLE}"`);
    await pool.query(`DROP TABLE IF EXISTS "${STORE_TABLE}"`);
    await pool.end();
  });

  it('filters a joined column with an "in" subquery alongside base constraints', async () => {
    const managedStores = subquery(StoreRepository)
      .select(['id'])
      .where({ manager: { '!': null } });

    const products = await ProductRepository.find({ select: ['name'] })
      .join('store')
      .where({ kind: { '!': 'archived' }, store: { id: { in: managedStores } } })
      .sort('name asc');

    expect(getNames(products)).toStrictEqual(['Acme crew', 'Acme dm']);
  });

  it('excludes multiple values from a joined column', async () => {
    const products = await ProductRepository.find({ select: ['name'] })
      .join('store')
      .where({ store: { name: { '!': ['Acme', 'Initech'] } } })
      .sort('name asc');

    expect(getNames(products)).toStrictEqual(['Globex channel', 'Globex crew']);
  });

  it('negates a where clause on the joined relationship', async () => {
    const products = await ProductRepository.find({ select: ['name'] })
      .join('store')
      .where({ store: { '!': { manager: null } } })
      .sort('name asc');

    expect(getNames(products)).toStrictEqual(['Acme crew', 'Acme dm']);
  });

  it('matches null alongside other values on a joined column', async () => {
    const products = await ProductRepository.find({ select: ['name'] })
      .join('store')
      .where({ store: { manager: [null, 'Zed'] } })
      .sort('name asc');

    expect(getNames(products)).toStrictEqual(['Globex channel', 'Globex crew']);
  });

  it('matches multiple datetime values on a joined column', async () => {
    const products = await ProductRepository.find({ select: ['name'] })
      .join('store')
      .where({ store: { openedAt: [ACME_OPENED_AT, new Date('2026-12-31T00:00:00Z')] } })
      .sort('name asc');

    expect(getNames(products)).toStrictEqual(['Acme crew', 'Acme dm']);
  });

  it('combines joined filters inside "or"', async () => {
    const products = await ProductRepository.find({ select: ['name'] })
      .join('store')
      .where({
        or: [
          { store: { name: 'Acme' }, kind: 'dm' },
          { store: { manager: null }, kind: 'channel' },
        ],
      })
      .sort('name asc');

    expect(getNames(products)).toStrictEqual(['Acme dm', 'Globex channel']);
  });
});
