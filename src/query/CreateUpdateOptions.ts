import type { Entity } from '../Entity';

import type { DoNotReturnRecords } from './DoNotReturnRecords';
import type { ReturnSelect } from './ReturnSelect';

export type CreateUpdateOptions<T extends Entity> = DoNotReturnRecords | ReturnSelect<T>;
