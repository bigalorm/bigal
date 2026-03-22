import { vi } from 'vitest';

import type { PoolLike, PoolQueryResult, QueryResultRow } from '../../src/index.js';

type PoolQueryFn = (text: string, values?: readonly unknown[]) => Promise<PoolQueryResult<QueryResultRow>>;

export function createMockPool(): PoolLike & { query: ReturnType<typeof vi.fn<PoolQueryFn>> } {
  return { query: vi.fn<PoolQueryFn>() } as PoolLike & { query: ReturnType<typeof vi.fn<PoolQueryFn>> };
}

export function getQueryResult<T extends QueryResultRow>(rows: T[] = []): PoolQueryResult<T> & { command: string; fields: never[]; oid: number } {
  return {
    command: 'select',
    rowCount: rows.length,
    oid: 0,
    fields: [],
    rows,
  };
}
