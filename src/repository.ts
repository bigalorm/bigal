import { FindArgs } from './query/FindArgs';
import { FindOneArgs } from './query/FindOneArgs';
import { CountResult } from './query/CountResult';
import { FindResult } from './query/FindResult';
import { FindOneResult } from './query/FindOneResult';
import { CreateUpdateDeleteOptions, DoNotReturnRecords } from './query/CreateUpdateDeleteOptions';
import { WhereQuery } from './query/WhereQuery';
import { DestroyResult } from './query/DestroyResult';

export interface Repository<T extends { [index: string]: any }> {
  findOne: (args?: FindOneArgs) => FindOneResult<T>;
  find: (args?: FindArgs) => FindResult<T>;
  count: (where?: WhereQuery) => CountResult<T>;
  create:
    ((values: Partial<T>, options: DoNotReturnRecords) => Promise<boolean>) |
    ((values: Partial<T>, options?: CreateUpdateDeleteOptions) => Promise<T | null>) |
    ((values: Array<Partial<T>>, options: DoNotReturnRecords) => Promise<boolean>) |
    ((values: Array<Partial<T>>, options?: CreateUpdateDeleteOptions) => Promise<T[]>);
  update:
    ((where: WhereQuery, values: Partial<T>, options: DoNotReturnRecords) => Promise<boolean>) |
    ((where: WhereQuery, values: Partial<T>, options?: CreateUpdateDeleteOptions) => Promise<T[]>);
  destroy:
    ((where: WhereQuery, options: DoNotReturnRecords) => DestroyResult<T, boolean>) |
    ((where: WhereQuery, options?: CreateUpdateDeleteOptions) => DestroyResult<T, T[]>);
}
