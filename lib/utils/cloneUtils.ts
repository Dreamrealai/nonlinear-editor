/**
 * Clone Utilities
 *
 * Provides safe deep cloning functions that handle edge cases
 * that structuredClone cannot handle (functions, symbols, DOM nodes, etc.)
 */

import type { Timeline, Clip } from '@/types/timeline';

/**
 * Deep clones a plain object, handling arrays and nested objects.
 * Filters out non-serializable properties (functions, symbols, undefined).
 *
 * This is safer than structuredClone for objects that may contain
 * non-cloneable properties from third-party libraries or computed values.
 *
 * @param obj - Object to clone
 * @returns Deep cloned object
 */
function deepClone<T>(obj: T): T {
  // Handle null and undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitives (string, number, boolean)
  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle Date objects
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  // Handle Array
  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as T;
  }

  // Handle Set
  if (obj instanceof Set) {
    return new Set(Array.from(obj).map((item) => deepClone(item))) as T;
  }

  // Handle Map
  if (obj instanceof Map) {
    const clonedMap = new Map();
    obj.forEach((value, key) => {
      clonedMap.set(deepClone(key), deepClone(value));
    });
    return clonedMap as T;
  }

  // Handle plain objects
  const clonedObj = {} as T;
  for (const key in obj) {
    // Skip non-own properties
    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
      continue;
    }

    const value = obj[key];

    // Skip functions, symbols, and undefined
    if (typeof value === 'function' || typeof value === 'symbol' || value === undefined) {
      continue;
    }

    // Recursively clone nested objects
    clonedObj[key] = deepClone(value);
  }

  return clonedObj;
}

/**
 * Safely clones a Timeline object for history snapshots.
 * Filters out non-serializable properties that might cause DataCloneError.
 *
 * @param timeline - Timeline to clone (can be null)
 * @returns Cloned timeline or null
 */
export function cloneTimeline(timeline: Timeline | null): Timeline | null {
  if (!timeline) return null;

  try {
    // First try structuredClone for better performance
    return structuredClone(timeline);
  } catch (error) {
    // If structuredClone fails (e.g., due to non-cloneable properties),
    // fall back to our custom deep clone
    console.warn('structuredClone failed, using fallback clone method:', error);
    return deepClone(timeline);
  }
}

/**
 * Safely clones a Clip object.
 * Filters out non-serializable properties that might cause DataCloneError.
 *
 * @param clip - Clip to clone
 * @returns Cloned clip
 */
export function cloneClip(clip: Clip): Clip {
  try {
    // First try structuredClone for better performance
    return structuredClone(clip);
  } catch (error) {
    // If structuredClone fails, fall back to our custom deep clone
    console.warn('structuredClone failed for clip, using fallback clone method:', error);
    return deepClone(clip);
  }
}

/**
 * Safely clones an array of clips.
 * Filters out non-serializable properties that might cause DataCloneError.
 *
 * @param clips - Array of clips to clone
 * @returns Cloned array of clips
 */
export function cloneClips(clips: Clip[]): Clip[] {
  try {
    // First try structuredClone for better performance
    return structuredClone(clips);
  } catch (error) {
    // If structuredClone fails, fall back to our custom deep clone
    console.warn('structuredClone failed for clips array, using fallback clone method:', error);
    return deepClone(clips);
  }
}
