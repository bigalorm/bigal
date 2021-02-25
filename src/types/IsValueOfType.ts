export type IsValueOfType<T, K extends PropertyKey, TValueType> = T extends TValueType | TValueType[] ? K : never;
