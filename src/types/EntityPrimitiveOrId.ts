import type { Entity } from '../Entity';

import type { OmitSubclassOfType } from './OmitSubclassOfType';

export type EntityPrimitiveOrId<T extends Entity, TIdKey extends keyof T = 'id'> = T extends Entity ? OmitSubclassOfType<T, Entity> | Pick<T, TIdKey> : T;
