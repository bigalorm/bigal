/**
 * Creates an object composed of the picked properties from the source object.
 * @param {T} obj - The source object
 * @param {K[]} keys - The property keys to pick (as rest arguments)
 * @returns {Pick<T, K>} A new object with only the specified properties
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K>;
/**
 * Creates an object composed of the picked properties from the source object.
 * @param {T} obj - The source object
 * @param {K[]} keys - The property keys to pick (as an array)
 * @returns {Pick<T, K>} A new object with only the specified properties
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>;
export function pick<T extends Record<string, unknown>, K extends keyof T>(obj: T, ...keysOrArray: K[] | [K[]]): Pick<T, K> {
  const keys = Array.isArray(keysOrArray[0]) ? keysOrArray[0] : (keysOrArray as K[]);
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }

  return result;
}
