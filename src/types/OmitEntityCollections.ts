import type { HasManyKeys, SchemaDefinition } from '../schema/InferTypes.js';

/**
 * Removes hasMany collection keys from a row type.
 * When a concrete TSchema is provided, only hasMany keys are excluded.
 * When TSchema is the default, all keys are preserved.
 */
export type OmitEntityCollections<T, TSchema extends SchemaDefinition = SchemaDefinition> = SchemaDefinition extends TSchema ? T : Omit<T, HasManyKeys<TSchema> & keyof T>;
