/**
 * Makes all properties optional for create/update operations.
 * BelongsTo fields already accept both FK values and entity objects via `EntityOrId` in InferSelect.
 */
export type CreateUpdateParams<T extends Record<string, unknown>> = {
  [K in keyof T]?: T[K];
};
