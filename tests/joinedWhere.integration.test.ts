import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'postgres-pool';

import { initialize, type Repository, subquery, type WhereQuery } from '../src/index.js';

import { JoinedFilterProduct } from './integrationModels/JoinedFilterProduct.js';
import { JoinedFilterStore } from './integrationModels/JoinedFilterStore.js';
import { getJoinedFilterProductTable, getJoinedFilterStoreTable, getJoinedFilterTierType } from './integrationModels/joinedFilterTableNames.js';

const DATABASE_URL = process.env.BIGAL_TEST_DATABASE_URL;
const STORE_TABLE = getJoinedFilterStoreTable();
const PRODUCT_TABLE = getJoinedFilterProductTable();
const TIER_TYPE = getJoinedFilterTierType();
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

    await pool.query('CREATE EXTENSION IF NOT EXISTS citext');
    await pool.query(`CREATE TYPE "${TIER_TYPE}" AS ENUM ('bronze', 'gold', 'silver')`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${STORE_TABLE}" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "manager" TEXT,
        "opened_at" TIMESTAMPTZ NOT NULL,
        "code" CITEXT NOT NULL,
        "tier" "${TIER_TYPE}" NOT NULL,
        "tags" TEXT[] NOT NULL
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${PRODUCT_TABLE}" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "kind" TEXT NOT NULL,
        "store_id" INTEGER NOT NULL REFERENCES "${STORE_TABLE}"("id"),
        "details" JSONB
      )
    `);

    const repositories = initialize({ models: [JoinedFilterProduct, JoinedFilterStore], pool });
    StoreRepository = repositories.JoinedFilterStore as Repository<JoinedFilterStore>;
    ProductRepository = repositories.JoinedFilterProduct as Repository<JoinedFilterProduct>;

    const managedStore = await StoreRepository.create({ name: 'Acme', manager: 'Ann', openedAt: ACME_OPENED_AT, code: 'ACME', tier: 'gold', tags: ['retail', 'east'] });
    const unmanagedStore = await StoreRepository.create({ name: 'Globex', manager: null, openedAt: GLOBEX_OPENED_AT, code: 'GLOBEX', tier: 'silver', tags: ['wholesale'] });
    await ProductRepository.create([
      { name: 'Acme crew', kind: 'crew', store: managedStore.id, details: { store: 'north', and: { status: 'active' } } },
      { name: 'Acme dm', kind: 'dm', store: managedStore.id, details: { store: 'south', and: { status: 'inactive' } } },
      { name: 'Globex channel', kind: 'channel', store: unmanagedStore.id, details: { store: 'north' } },
      { name: 'Globex crew', kind: 'crew', store: unmanagedStore.id, details: null },
    ]);
  });

  afterAll(async () => {
    await pool.query(`DROP TABLE IF EXISTS "${PRODUCT_TABLE}"`);
    await pool.query(`DROP TABLE IF EXISTS "${STORE_TABLE}"`);
    await pool.query(`DROP TYPE IF EXISTS "${TIER_TYPE}"`);
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

  it('matches multiple values on a joined citext column without regard to case', async () => {
    const products = await ProductRepository.find({ select: ['name'] })
      .join('store')
      .where({ store: { code: ['acme', 'initech'] } })
      .sort('name asc');

    expect(getNames(products)).toStrictEqual(['Acme crew', 'Acme dm']);
  });

  it('matches and excludes multiple values on a joined enum column', async () => {
    const included = await ProductRepository.find({ select: ['name'] })
      .join('store')
      .where({ store: { tier: ['gold', 'bronze'] } })
      .sort('name asc');
    const excluded = await ProductRepository.find({ select: ['name'] })
      .join('store')
      .where({ store: { tier: { '!': ['gold', 'bronze'] } } })
      .sort('name asc');

    expect(getNames(included)).toStrictEqual(['Acme crew', 'Acme dm']);
    expect(getNames(excluded)).toStrictEqual(['Globex channel', 'Globex crew']);
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

  it('excludes rows matched by an "in" subquery on a joined column', async () => {
    const managedStores = subquery(StoreRepository)
      .select(['id'])
      .where({ manager: { '!': null } });

    const products = await ProductRepository.find({ select: ['name'] })
      .join('store')
      .where({ store: { id: { '!': { in: managedStores } } } })
      .sort('name asc');

    expect(getNames(products)).toStrictEqual(['Globex channel', 'Globex crew']);
  });

  it('supports "not" on a joined column', async () => {
    const products = await ProductRepository.find({ select: ['name'] })
      .join('store')
      .where({ store: { name: { not: 'Acme' } } })
      .sort('name asc');

    expect(getNames(products)).toStrictEqual(['Globex channel', 'Globex crew']);
  });

  it('applies an outer negation to a joined relationship filter', async () => {
    const products = await ProductRepository.find({ select: ['name'] })
      .join('store')
      .where({ '!': { store: { name: 'Acme' } } } as WhereQuery<JoinedFilterProduct>)
      .sort('name asc');

    expect(getNames(products)).toStrictEqual(['Globex channel', 'Globex crew']);
  });

  it('matches any of several "contains" values on a joined column', async () => {
    const products = await ProductRepository.find({ select: ['name'] })
      .join('store')
      .where({ store: { name: { contains: ['cm', 'nitech'] } } })
      .sort('name asc');

    expect(getNames(products)).toStrictEqual(['Acme crew', 'Acme dm']);
  });

  it('supports negations inside "or" on a joined relationship', async () => {
    const products = await ProductRepository.find({ select: ['name'] })
      .join('store')
      .where({ store: { or: [{ name: { '!': 'Globex' } }, { code: 'INITECH' }] } })
      .sort('name asc');

    expect(getNames(products)).toStrictEqual(['Acme crew', 'Acme dm']);
  });

  it('matches values inside a string array column on a joined model', async () => {
    const containing = await ProductRepository.find({ select: ['name'] })
      .join('store')
      .where({ store: { tags: 'east' } })
      .sort('name asc');
    const like = await ProductRepository.find({ select: ['name'] })
      .join('store')
      .where({ store: { tags: { like: 'whole%' } } })
      .sort('name asc');

    expect(getNames(containing)).toStrictEqual(['Acme crew', 'Acme dm']);
    expect(getNames(like)).toStrictEqual(['Globex channel', 'Globex crew']);
  });

  it('filters on an entity instance passed for a custom join alias', async () => {
    const acmeStore = await StoreRepository.findOne({ name: 'Acme' });
    expect(acmeStore).toBeDefined();

    const products = await ProductRepository.find({ select: ['name'] })
      .join('store', 'primaryStore')
      .where({ primaryStore: acmeStore! })
      .sort('name asc');

    expect(getNames(products)).toStrictEqual(['Acme crew', 'Acme dm']);
  });

  it('filters joined columns through dot-notation paths', async () => {
    const managedStores = subquery(StoreRepository)
      .select(['id'])
      .where({ manager: { '!': null } });

    const included = await ProductRepository.find({ select: ['name'] })
      .join('store')
      .where({ kind: 'crew', 'store.name': ['Acme', 'Initech'] } as WhereQuery<JoinedFilterProduct>)
      .sort('name asc');
    const excluded = await ProductRepository.find({ select: ['name'] })
      .join('store')
      .where({ 'store.name': { '!': ['Acme', 'Initech'] } } as WhereQuery<JoinedFilterProduct>)
      .sort('name asc');
    const inSubquery = await ProductRepository.find({ select: ['name'] })
      .join('store')
      .where({ 'store.id': { in: managedStores } } as WhereQuery<JoinedFilterProduct>)
      .sort('name asc');

    expect(getNames(included)).toStrictEqual(['Acme crew']);
    expect(getNames(excluded)).toStrictEqual(['Globex channel', 'Globex crew']);
    expect(getNames(inSubquery)).toStrictEqual(['Acme crew', 'Acme dm']);
  });

  it('keeps a negated "and" grouped so it does not bypass sibling constraints', async () => {
    const products = await ProductRepository.find({ select: ['name'] })
      .where({ kind: 'crew', '!': { and: [{ name: 'Acme crew' }, { kind: 'dm' }] } } as WhereQuery<JoinedFilterProduct>)
      .sort('name asc');

    expect(getNames(products)).toStrictEqual(['Acme crew', 'Globex crew']);
  });

  it('treats a JSON property named like a join alias as JSON when the relationship is joined', async () => {
    const products = await ProductRepository.find({ select: ['name'] })
      .join('store')
      .where({ details: { store: { '!': 'south' } } })
      .sort('name asc');

    expect(getNames(products)).toStrictEqual(['Acme crew', 'Globex channel']);
  });

  it('treats "and" under a JSON column as a JSON property name', async () => {
    const products = await ProductRepository.find({ select: ['name'] })
      .where({ details: { and: { status: 'active' } } })
      .sort('name asc');

    expect(getNames(products)).toStrictEqual(['Acme crew']);
  });
});
