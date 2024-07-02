/**
 * Removes all functions and entity collection properties. To be used as a re-map key function
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type ExcludeFunctions<T, K extends PropertyKey> = T extends Function ? never : K;
