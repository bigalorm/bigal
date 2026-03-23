import type { InferSelect } from '../schema/InferTypes.js';
import type { TableDefinition } from '../schema/TableDefinition.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- variance: models use contravariant hook params
type AnyModel = TableDefinition<string, any>;

/**
 * Resolves a model name string to the query result row type using the models map.
 * Used by populate() to produce fully typed results for related entities.
 *
 * Falls back to `Record<string, unknown>` when the model name isn't in the map.
 */
export type ResolveModel<TModels extends Record<string, AnyModel>, TModelName extends string> = TModelName extends keyof TModels
  ? TModels[TModelName] extends TableDefinition<string, infer TSchema>
    ? InferSelect<TSchema>
    : Record<string, unknown>
  : Record<string, unknown>;

/**
 * Default models map type. When TModels is this default, populate falls back
 * to `Record<string, unknown>` for populated entity types.
 */
export type DefaultModelsMap = Record<string, AnyModel>;
