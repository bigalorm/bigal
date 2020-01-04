import { WhereQuery } from './WhereQuery';
import { ChainablePromiseLike } from '../ChainablePromiseLike';

export interface CountResult<TEntity> extends ChainablePromiseLike<number> {
  where(args: WhereQuery): CountResult<TEntity> | number;
}
