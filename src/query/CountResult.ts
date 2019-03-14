import { WhereQuery } from './WhereQuery';

export interface CountResult<TEntity> {
  where: (args: WhereQuery) => CountResult<TEntity> | number;
  then: (resolve: (thenableOrResult?: number | PromiseLike<number>) => void, reject: (err: Error) => void) => Promise<void>;
}
