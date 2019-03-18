import { WhereQuery } from './WhereQuery';

export interface FindOneArgs {
  select?: string[];
  where?: WhereQuery;
  sort?: string | string[];
}
