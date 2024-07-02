import type { Entity } from '../Entity.js';

export type EntityPrimitiveOrId<T> = T extends []
  ? T extends (infer U)[]
    ? EntityPrimitiveOrId<U>[]
    : T // Unable to determine array type, so return original
  : Extract<NonNullable<T>, Entity> extends undefined
    ? T
    : Exclude<NonNullable<T>, Entity> | Pick<Extract<NonNullable<T>, Entity>, 'id'>;
