import type { DoNotReturnRecords } from './DoNotReturnRecords';
import type { ReturnSelect } from './ReturnSelect';

export type CreateUpdateOptions<T> = DoNotReturnRecords | ReturnSelect<T>;
