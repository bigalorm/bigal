import type { GetValueType } from './GetValueType';
import type { IsValueOfType } from './IsValueOfType';

export type PickByValueType<T, TValueType> = {
  [K in keyof T as IsValueOfType<T[K], K, TValueType>]: GetValueType<T[K], TValueType>;
};
