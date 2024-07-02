import type { Entity } from '../Entity.js';

import type { DoNotReturnRecords } from './DoNotReturnRecords.js';
import type { ReturnSelect } from './ReturnSelect.js';

export type CreateUpdateOptions<T extends Entity> = DoNotReturnRecords | ReturnSelect<T>;
