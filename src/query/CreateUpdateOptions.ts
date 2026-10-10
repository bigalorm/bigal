import { type Entity } from '../Entity.js';

import { type CommentOptions } from './CommentOptions.js';
import { type DoNotReturnRecords } from './DoNotReturnRecords.js';
import { type ExecutionOptions } from './ExecutionOptions.js';
import { type ReturnSelect } from './ReturnSelect.js';

export type CreateUpdateOptions<T extends Entity> = CommentOptions & ExecutionOptions & (DoNotReturnRecords | Partial<ReturnSelect<T>>);
