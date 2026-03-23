import type { HasManyKeys, SchemaDefinition } from '../schema/InferTypes.js';

/**
 * Excludes hasMany collection keys from K when a concrete TSchema is provided.
 * Falls back to passing through all keys when TSchema is the default.
 */
export type ExcludeEntityCollections<K extends PropertyKey, TSchema extends SchemaDefinition = SchemaDefinition> = SchemaDefinition extends TSchema ? K : K extends HasManyKeys<TSchema> ? never : K;
