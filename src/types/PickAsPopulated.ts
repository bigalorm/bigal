import type { Populated } from './Populated';

export type PickAsPopulated<T, TProperty extends keyof T> = Populated<Pick<T, TProperty>, TProperty>;
