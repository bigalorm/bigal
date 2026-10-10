import { type Entity } from '../Entity.js';

import { type WhereQuery } from './WhereQuery.js';

export interface CountResult<TEntity extends Entity> extends PromiseLike<number> {
  where(args: WhereQuery<TEntity>): CountResult<TEntity>;
  /**
   * Adds a SQL comment to the query, to identify it in tools like pg_stat_statements and Performance Insights
   * @param value - Comment text. Cannot contain `/*` or `*\/`
   */
  comment(value: string): CountResult<TEntity>;
}
