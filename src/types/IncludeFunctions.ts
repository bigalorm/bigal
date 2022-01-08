/**
 * Returns the key name if the property type is a function
 */
// NOTE: eslint does not like using `Function`.
// eslint-disable-next-line @typescript-eslint/ban-types
export type IncludeFunctions<T, K extends PropertyKey> = T extends Function ? K : never;
