import { WhereQuery } from './WhereQuery';
import { PopulateArgs } from './PopulateArgs';

export interface FindOneResult<TEntity extends { [index: string]: any }> {
  where: (args: WhereQuery) => FindOneResult<TEntity> | TEntity | null;
  populate: (propertyName: Extract<keyof TEntity, string>, options?: PopulateArgs) => FindOneResult<TEntity> | TEntity | null;
  sort: (value: string | object) => FindOneResult<TEntity> | TEntity | null;
  then: (resolve: (thenableOrResult?: (TEntity | null) | PromiseLike<TEntity | null>) => void, reject: (err: Error) => void) => Promise<void>;
}
