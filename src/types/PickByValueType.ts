import type { GetValueType } from './GetValueType.js';
import type { IsValueOfType } from './IsValueOfType.js';

export type PickByValueType<T, TValueType> = {
  [K in keyof T as IsValueOfType<T[K], K, TValueType>]: GetValueType<T[K], TValueType>;
};
