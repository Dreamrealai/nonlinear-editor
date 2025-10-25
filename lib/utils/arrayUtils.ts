/**
 * Array Utility Functions
 *
 * Provides safe array access methods with bounds checking to prevent runtime errors.
 */

/**
 * Safely gets an element from an array with bounds checking.
 * Returns undefined if index is out of bounds instead of throwing an error.
 *
 * @param array - Array to access
 * @param index - Index to retrieve
 * @returns Element at index or undefined if out of bounds
 *
 * @example
 * const arr = [1, 2, 3];
 * safeArrayGet(arr, 0); // 1
 * safeArrayGet(arr, 5); // undefined
 * safeArrayGet(arr, -1); // undefined
 */
export function safeArrayGet<T>(array: T[] | readonly T[], index: number): T | undefined {
  if (!Array.isArray(array)) {
    return undefined;
  }

  if (index < 0 || index >= array.length || !Number.isInteger(index)) {
    return undefined;
  }

  return array[index];
}

/**
 * Safely gets an element from an array with a default fallback value.
 *
 * @param array - Array to access
 * @param index - Index to retrieve
 * @param defaultValue - Value to return if index is out of bounds
 * @returns Element at index or defaultValue if out of bounds
 *
 * @example
 * const arr = [1, 2, 3];
 * safeArrayGetWithDefault(arr, 0, 0); // 1
 * safeArrayGetWithDefault(arr, 5, 0); // 0
 */
export function safeArrayGetWithDefault<T>(
  array: T[] | readonly T[],
  index: number,
  defaultValue: T
): T {
  const value = safeArrayGet(array, index);
  return value !== undefined ? value : defaultValue;
}

/**
 * Safely gets the first element of an array.
 *
 * @param array - Array to access
 * @returns First element or undefined if array is empty
 *
 * @example
 * const arr = [1, 2, 3];
 * safeArrayFirst(arr); // 1
 * safeArrayFirst([]); // undefined
 */
export function safeArrayFirst<T>(array: T[] | readonly T[]): T | undefined {
  return safeArrayGet(array, 0);
}

/**
 * Safely gets the last element of an array.
 *
 * @param array - Array to access
 * @returns Last element or undefined if array is empty
 *
 * @example
 * const arr = [1, 2, 3];
 * safeArrayLast(arr); // 3
 * safeArrayLast([]); // undefined
 */
export function safeArrayLast<T>(array: T[] | readonly T[]): T | undefined {
  if (!Array.isArray(array) || array.length === 0) {
    return undefined;
  }
  return array[array.length - 1];
}

/**
 * Checks if an index is within array bounds.
 *
 * @param array - Array to check
 * @param index - Index to validate
 * @returns True if index is valid, false otherwise
 *
 * @example
 * const arr = [1, 2, 3];
 * isValidArrayIndex(arr, 0); // true
 * isValidArrayIndex(arr, 5); // false
 * isValidArrayIndex(arr, -1); // false
 */
export function isValidArrayIndex<T>(array: T[] | readonly T[], index: number): boolean {
  return Array.isArray(array) && Number.isInteger(index) && index >= 0 && index < array.length;
}

/**
 * Safely slices an array with bounds checking.
 * Clamps start and end indices to valid range.
 *
 * @param array - Array to slice
 * @param start - Start index (defaults to 0)
 * @param end - End index (defaults to array length)
 * @returns Sliced array
 *
 * @example
 * const arr = [1, 2, 3, 4, 5];
 * safeArraySlice(arr, 1, 3); // [2, 3]
 * safeArraySlice(arr, -10, 100); // [1, 2, 3, 4, 5]
 */
export function safeArraySlice<T>(array: T[] | readonly T[], start: number = 0, end?: number): T[] {
  if (!Array.isArray(array)) {
    return [];
  }

  const safeStart = Math.max(0, Math.min(start, array.length));
  const safeEnd = end !== undefined ? Math.max(0, Math.min(end, array.length)) : array.length;

  return array.slice(safeStart, safeEnd);
}

/**
 * Safely finds an element in an array with a predicate function.
 * Returns undefined if not found instead of potentially returning undefined from the array itself.
 *
 * @param array - Array to search
 * @param predicate - Function to test each element
 * @returns Found element or undefined
 */
export function safeArrayFind<T>(
  array: T[] | readonly T[],
  predicate: (value: T, index: number, array: readonly T[]) => boolean
): T | undefined {
  if (!Array.isArray(array)) {
    return undefined;
  }

  return array.find(predicate);
}

/**
 * Safely gets the max value from a numeric array.
 * Returns a default value if array is empty or contains no valid numbers.
 *
 * @param array - Array of numbers
 * @param defaultValue - Value to return if array is empty (defaults to 0)
 * @returns Maximum value or default
 */
export function safeArrayMax(array: number[], defaultValue: number = 0): number {
  if (!Array.isArray(array) || array.length === 0) {
    return defaultValue;
  }

  const validNumbers = array.filter((n) => typeof n === 'number' && Number.isFinite(n));

  if (validNumbers.length === 0) {
    return defaultValue;
  }

  return Math.max(...validNumbers);
}

/**
 * Safely gets the min value from a numeric array.
 * Returns a default value if array is empty or contains no valid numbers.
 *
 * @param array - Array of numbers
 * @param defaultValue - Value to return if array is empty (defaults to 0)
 * @returns Minimum value or default
 */
export function safeArrayMin(array: number[], defaultValue: number = 0): number {
  if (!Array.isArray(array) || array.length === 0) {
    return defaultValue;
  }

  const validNumbers = array.filter((n) => typeof n === 'number' && Number.isFinite(n));

  if (validNumbers.length === 0) {
    return defaultValue;
  }

  return Math.min(...validNumbers);
}
