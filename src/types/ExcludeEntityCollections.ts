/**
 * Passes through all properties. In the new schema API, collections are already excluded by InferSelect.
 * Preserved for backward compatibility with internal repository code.
 */
// oxlint-disable-next-line no-unused-vars -- T required at call sites for API compatibility
export type ExcludeEntityCollections<_T, K extends PropertyKey> = K;
