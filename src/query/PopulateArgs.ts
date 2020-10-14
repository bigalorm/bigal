import type { WhereQuery } from './WhereQuery';

export interface PopulateArgs {
  where?: WhereQuery;
  select?: string[];
  sort?: string | string[];
  skip?: number;
  limit?: number;
}
