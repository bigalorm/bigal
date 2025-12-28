/**
 * Represents a row returned from a PostgreSQL query.
 * Compatible with pg's QueryResultRow type.
 */
/* eslint-disable @typescript-eslint/consistent-indexed-object-style, @typescript-eslint/no-explicit-any -- Interface with `any` needed for class instance compatibility (matches pg's QueryResultRow) */
export interface QueryResultRow {
  [column: string]: any;
}
/* eslint-enable @typescript-eslint/consistent-indexed-object-style, @typescript-eslint/no-explicit-any */

export interface PoolQueryResult<TRow extends QueryResultRow> {
  rows: TRow[];
  rowCount: number | null;
}

/**
 * Minimal interface for a PostgreSQL connection pool.
 * This interface is compatible with postgres-pool, node-postgres (pg),
 * `@neondatabase/serverless`, and other pg-compatible drivers.
 */
export interface PoolLike {
  query<TRow extends QueryResultRow = QueryResultRow>(text: string, values?: readonly unknown[]): Promise<PoolQueryResult<TRow>>;
}
