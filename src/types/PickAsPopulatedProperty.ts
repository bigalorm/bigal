import type { PopulatedProperties } from './PopulatedProperties';

export type PickAsPopulatedProperty<T, TProperty extends keyof T> = PopulatedProperties<Pick<T, TProperty>>;
