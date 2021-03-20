// Omit types that extend TValueType
export type OmitSubclassOfType<T, TValueType> = T extends TValueType[] | undefined ? never : T extends TValueType | undefined ? never : T;
