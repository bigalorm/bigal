import type { Entity } from '../Entity';

export type EntityPrimitiveOrId<T extends Entity, TIdKey extends keyof T = 'id'> = T extends Entity ? Exclude<T, Entity> | Pick<T, TIdKey> : T;
