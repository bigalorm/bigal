/**
 * Passes through all properties. In the new schema API, collections are already excluded by InferSelect.
 * Preserved for backward compatibility with internal repository code.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- T preserved for API compatibility
export type ExcludeEntityCollections<T, K extends PropertyKey> = K;
