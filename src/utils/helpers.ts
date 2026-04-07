// Valid PostgreSQL identifier: starts with letter or underscore, contains letters, digits, underscores, or dots (for alias.column notation)
const VALID_SQL_IDENTIFIER = /^[A-Z_a-z][\w.]*$/;

export function assertValidSqlIdentifier(value: string, context: string): void {
  if (!VALID_SQL_IDENTIFIER.test(value)) {
    throw new Error(`Invalid SQL identifier for ${context}: "${value}". Identifiers must start with a letter or underscore and contain only letters, numbers, underscores, and dots.`);
  }
}

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
 * Naive English singularization for common table name patterns.
 * Handles: -ies → -y, -ses → -s, -es → -e, -s → (drop s).
 * Does NOT handle irregular plurals (people, children, etc.).
 * @param {string} word - The word to singularize
 */
export function singularize(word: string): string {
  if (word.endsWith('ies')) {
    return `${word.slice(0, -3)}y`;
  }

  if (word.endsWith('sses') || word.endsWith('uses')) {
    return word.slice(0, -2);
  }

  if (word.endsWith('ses')) {
    return word.slice(0, -1);
  }

  if (word.endsWith('s') && !word.endsWith('ss')) {
    return word.slice(0, -1);
  }

  return word;
}

/**
 * Converts a table name to a PascalCase singular model name.
 * @param {string} tableName - The PostgreSQL table name
 * @example modelNameFromTable('products') // 'Product'
 * @example modelNameFromTable('product__category') // 'ProductCategory'
 * @example modelNameFromTable('categories') // 'Category'
 * @example modelNameFromTable('stores') // 'Store'
 */
export function modelNameFromTable(tableName: string): string {
  return words(tableName)
    .map((word, index, arr) => {
      // Only singularize the last word (e.g., 'products' → 'product', but 'product_categories' → 'product' + 'category')
      const processed = index === arr.length - 1 ? singularize(word) : word;
      return processed.charAt(0).toUpperCase() + processed.slice(1).toLowerCase();
    })
    .join('');
}

/**
 * Converts a string to PascalCase.
 * @param {string} str - The string to convert
 * @example pascalCase('products') // 'Products'
 * @example pascalCase('product__category') // 'ProductCategory'
 * @example pascalCase('foo_bar') // 'FooBar'
 */
export function pascalCase(str: string): string {
  return words(str)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Converts a string to snake_case.
 * @param {string} str - The string to convert
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
