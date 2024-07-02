/**
 * Returns the key name if the property type is a function
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type IncludeFunctions<T, K extends PropertyKey> = T extends Function ? K : never;
