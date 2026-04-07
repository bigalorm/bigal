import type { DoNotReturnRecords } from './DoNotReturnRecords.js';
import type { ReturnSelect } from './ReturnSelect.js';

export type CreateUpdateOptions<T extends Record<string, unknown>> = DoNotReturnRecords | ReturnSelect<T>;
