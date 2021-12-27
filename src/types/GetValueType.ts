export type GetValueType<T, TValueType> = T extends TValueType[] ? (T extends (infer U)[] ? Extract<U, TValueType> : never) : T extends TValueType ? T : never;
