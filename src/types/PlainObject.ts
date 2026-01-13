/**
 * Recursively converts entity types to plain object types.
 * This is primarily for documentation/intent - at runtime, this strips the prototype chain.
 * Preserves Date objects as-is since they're serializable by most frameworks.
 */
export type PlainObject<T> = T extends Date ? Date : T extends (infer U)[] ? PlainObject<U>[] : T extends object ? { [K in keyof T]: PlainObject<T[K]> } : T;
