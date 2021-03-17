export type IsValueOfType<T, K extends PropertyKey, TValueType> = T extends TValueType | TValueType[] | undefined ? K : never;
