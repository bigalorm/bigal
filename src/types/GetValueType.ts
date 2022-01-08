export type GetValueType<T, TValueType> = T extends TValueType[] // If type is an array
  ? T extends (infer U)[] // Infer the array item type
    ? Extract<U, TValueType> // Return the array item type as a TValueType if array type can be inferred
    : never // Unable to infer the array type
  : T extends TValueType
  ? T
  : never;
