/**
 * In the new schema API, FK and entity types are already resolved by InferSelect.
 * This type is preserved as a passthrough for backward compatibility.
 */
export type EntityPrimitiveOrId<T> = T;
