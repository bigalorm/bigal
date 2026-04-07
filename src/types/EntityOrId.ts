/**
 * Accepts either a FK value or an entity object with a matching `id` property.
 * BigAl extracts the primary key at runtime when an object is provided.
 *
 * @example
 * ```ts
 * // Both are valid for a belongsTo field:
 * product.store = 5;                          // FK value
 * product.store = { id: 5, name: 'Acme' };   // Entity object
 * ```
 */
export type EntityOrId<TFk> = TFk | (Record<string, unknown> & { id: TFk });
