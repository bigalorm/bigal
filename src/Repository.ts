import { FindArgs } from './query/FindArgs';
import { FindOneArgs } from './query/FindOneArgs';
import { CountResult } from './query/CountResult';
import { FindResult } from './query/FindResult';
import { FindOneResult } from './query/FindOneResult';
import { CreateUpdateDeleteOptions, DoNotReturnRecords } from './query/CreateUpdateDeleteOptions';
import { WhereQuery } from './query/WhereQuery';
import { DestroyResult } from './query/DestroyResult';
import { Entity } from './Entity';

export interface Repository<T extends Entity> {
  findOne(args?: FindOneArgs | WhereQuery): FindOneResult<T>;
  find(args?: FindArgs | WhereQuery): FindResult<T>;
  count(where?: WhereQuery): CountResult<T>;
  create(values: Partial<T>, options?: CreateUpdateDeleteOptions): Promise<T>;
  create(values: Partial<T> | Array<Partial<T>>, options: DoNotReturnRecords): Promise<boolean>;
  create(values: Array<Partial<T>>, options?: CreateUpdateDeleteOptions): Promise<T[]>;
  update(where: WhereQuery, values: Partial<T>, options: DoNotReturnRecords): Promise<boolean>;
  update(where: WhereQuery, values: Partial<T>, options?: CreateUpdateDeleteOptions): Promise<T[]>;
  destroy(where: WhereQuery, options: DoNotReturnRecords): DestroyResult<T, boolean>;
  destroy(where?: WhereQuery, options?: CreateUpdateDeleteOptions): DestroyResult<T, T[]>;
}
