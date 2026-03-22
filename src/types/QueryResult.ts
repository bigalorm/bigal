import type { HasManyKeys, SchemaDefinition } from '../schema/InferTypes.js';

/**
 * Narrows a row type for query results by excluding hasMany collection keys.
 * When a concrete TSchema is provided, hasMany keys are removed.
 * When TSchema is the default (SchemaDefinition), all keys are preserved.
 */
export type QueryResult<T extends Record<string, unknown>, TSchema extends SchemaDefinition = SchemaDefinition> = SchemaDefinition extends TSchema ? T : Omit<T, HasManyKeys<TSchema> & keyof T>;
