import type { RelationshipKeys, SchemaDefinition } from '../schema/InferTypes.js';

/**
 * Identifies keys that are relationships (belongsTo or hasMany).
 * Used to constrain `.join()` and `.leftJoin()` to relationship properties only.
 * When a concrete TSchema is provided, only actual relationship keys are returned.
 * When TSchema is the default (SchemaDefinition), falls back to all string keys.
 */
export type ModelRelationshipKeys<T extends Record<string, unknown>, TSchema extends SchemaDefinition = SchemaDefinition> = SchemaDefinition extends TSchema
  ? string & keyof T
  : string & RelationshipKeys<TSchema> & keyof T;
