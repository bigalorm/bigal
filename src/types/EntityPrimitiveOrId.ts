import type { Entity } from '../Entity';

export type EntityPrimitiveOrId<T extends Entity> = Extract<NonNullable<T>, Entity> extends Entity ? Exclude<NonNullable<T>, Entity> | Pick<T, 'id'> : T;
