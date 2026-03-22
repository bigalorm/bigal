/**
 * In the new schema API, relationship keys are determined from the TableDefinition metadata
 * rather than by inspecting which properties extend Entity. This type is preserved as a
 * passthrough that returns all string keys, since repositories use runtime metadata to
 * identify relationships.
 */
export type ModelRelationshipKeys<T extends Record<string, unknown>> = string & keyof T;
