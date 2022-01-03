/**
 * Removes all functions and entity collection properties. To be used as a re-map key function
 */
// NOTE: eslint does not like using `Function`.
// eslint-disable-next-line @typescript-eslint/ban-types
export type ExcludeFunctions<T, K extends PropertyKey> = T extends Function ? never : K;
