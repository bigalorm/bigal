import type { BelongsToKeys, SchemaDefinition } from '../schema/InferTypes.js';

/**
 * Makes all properties optional for create/update operations.
 * When a concrete TSchema is provided, belongsTo columns also accept a hydrated entity
 * object (e.g., `{ id: 5, name: 'Acme' }`). BigAl extracts the primary key at runtime.
 * When TSchema is the default, all values use their original type.
 */
export type CreateUpdateParams<T extends Record<string, unknown>, TSchema extends SchemaDefinition = SchemaDefinition> = SchemaDefinition extends TSchema
  ? { [K in keyof T]?: T[K] }
  : {
      [K in Exclude<keyof T, BelongsToKeys<TSchema>>]?: T[K];
    } & {
      [K in BelongsToKeys<TSchema> & keyof T]?: T[K] | Record<string, unknown>;
    };
