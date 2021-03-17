// Omit types that extend TValueType
export type OmitSubclassOfType<T, TValueType> = T extends TValueType[] ? never : T extends TValueType ? never : T;
