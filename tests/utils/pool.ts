import { type Mock, vi } from 'vitest';

import { type PoolLike, type PoolQueryResult, type QueryResultRow } from '../../src/index.js';

export type PoolQuery = (text: string, values?: readonly unknown[]) => Promise<PoolQueryResult<QueryResultRow>>;

export type MockPool = PoolLike & { query: Mock<PoolQuery> };

export function createMockPool(): MockPool {
  const pool = { query: vi.fn<PoolQuery>() };
  return pool as MockPool;
}

export function getQueryResult<TRow extends QueryResultRow>(rows: TRow[] = []): PoolQueryResult<TRow> {
  return {
    rowCount: rows.length,
    rows,
  };
}
