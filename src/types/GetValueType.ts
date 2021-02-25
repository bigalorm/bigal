export type GetValueType<T, TValueType> = T extends TValueType[] ? (T extends (infer U)[] ? U : never) : T extends TValueType ? T : never;
