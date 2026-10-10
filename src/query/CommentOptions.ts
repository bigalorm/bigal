export interface CommentOptions {
  /**
   * Text to add to the query as a SQL comment, to identify it in tools like pg_stat_statements and Performance Insights.
   * Cannot contain `/*` or `*\/`
   */
  comment?: string;
}
