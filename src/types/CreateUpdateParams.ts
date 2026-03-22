/**
 * Makes all properties optional for create/update operations.
 * In the new schema API, property types are already correct from InferSelect.
 */
export type CreateUpdateParams<T extends Record<string, unknown>> = {
  [K in keyof T]?: T[K];
};
