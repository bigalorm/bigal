const CASE_SPLIT_PATTERN = /\p{Lu}?\p{Ll}+|[0-9]+|\p{Lu}+(?!\p{Ll})|\p{Emoji_Presentation}|\p{Extended_Pictographic}|\p{L}+/gu;

/**
 * Splits a string into words, handling camelCase, PascalCase, numbers, and unicode.
 * @param {string} str - The string to split
 * @returns {string[]} Array of words
 */
function words(str: string): string[] {
  return Array.from(str.match(CASE_SPLIT_PATTERN) ?? []);
}

/**
 * Converts a string to snake_case.
 * Matches lodash/es-toolkit behavior.
 * @param {string} str - The string to convert
 * @returns {string} The snake_case version of the string
 * @example snakeCase('fooBar') // 'foo_bar'
 * @example snakeCase('FooBar') // 'foo_bar'
 * @example snakeCase('foo-bar') // 'foo_bar'
 * @example snakeCase('HTMLParser') // 'html_parser'
 */
export function snakeCase(str: string): string {
  return words(str)
    .map((word) => word.toLowerCase())
    .join('_');
}

/**
 * Creates an object composed of keys generated from the results of running each element
 * of the array through the iteratee. The value of each key is the last element responsible
 * for generating the key.
 * @param {readonly T[]} array - The array to iterate over
 * @param {string} key - The property name to use as the key
 * @returns {Record<string, T>} An object with keys from the property values
 * @example keyBy([{ id: 1, name: 'a' }, { id: 2, name: 'b' }], 'id') // { 1: { id: 1, name: 'a' }, 2: { id: 2, name: 'b' } }
 */
export function keyBy<T extends Record<string, unknown>>(array: readonly T[], key: string): Record<string, T> {
  const result: Record<string, T> = {};
  for (const item of array) {
    const keyValue = item[key];
    if (typeof keyValue === 'string' || typeof keyValue === 'number') {
      result[String(keyValue)] = item;
    }
  }

  return result;
}

/**
 * Creates an object composed of keys generated from the results of running each element
 * of the array through the iteratee. The value of each key is an array of elements responsible
 * for generating the key.
 * @param {readonly T[]} array - The array to iterate over
 * @param {string} key - The property name to group by
 * @returns {Record<string, T[]>} An object with arrays of items grouped by key
 * @example groupBy([{ type: 'a', val: 1 }, { type: 'a', val: 2 }, { type: 'b', val: 3 }], 'type')
 * // { a: [{ type: 'a', val: 1 }, { type: 'a', val: 2 }], b: [{ type: 'b', val: 3 }] }
 */
export function groupBy<T extends Record<string, unknown>>(array: readonly T[], key: string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of array) {
    const keyValue = item[key];
    if (typeof keyValue === 'string' || typeof keyValue === 'number') {
      const keyStr = String(keyValue);
      result[keyStr] ??= [];
      result[keyStr].push(item);
    }
  }

  return result;
}
