import type { Entity } from '../Entity';

import type { OmitSubclassOfType } from './OmitSubclassOfType';

export type EntityPrimitiveOrId<T extends Entity, TIdKey extends keyof T = 'id'> = T extends Entity ? Extract<Pick<T, TIdKey>, T> | OmitSubclassOfType<T, Entity> : T;
