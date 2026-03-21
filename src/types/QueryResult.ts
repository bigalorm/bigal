/**
 * In the new schema API, InferSelect already produces the correct types for query results.
 * This type is preserved as a passthrough for backward compatibility.
 */
export type QueryResult<T extends Record<string, unknown>> = T;
