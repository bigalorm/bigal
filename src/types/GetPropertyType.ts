export type GetPropertyType<T, TProperty extends string & keyof T> = T[TProperty] extends unknown[] ? T[TProperty][0] : T[TProperty];
