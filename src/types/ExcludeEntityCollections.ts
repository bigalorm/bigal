/**
 * Passes through all properties. In the new schema API, collections are already excluded by InferSelect.
 * Preserved for backward compatibility with internal repository code.
 */
export type ExcludeEntityCollections<_T, K extends PropertyKey> = K;
