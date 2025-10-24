/**
 * Input Sanitization Utilities
 *
 * Provides utilities for sanitizing and normalizing user input to prevent
 * injection attacks and ensure data consistency.
 *
 * @module lib/api/sanitization
 */

/**
 * Sanitizes a string by removing or escaping potentially dangerous characters
 *
 * @param value - String to sanitize
 * @param options - Sanitization options
 * @returns Sanitized string
 *
 * @example
 * const clean = sanitizeString(userInput);
 * const cleanNoHtml = sanitizeString(userInput, { stripHtml: true });
 */
export function sanitizeString(
  value: string,
  options: {
    /** Remove HTML tags */
    stripHtml?: boolean;
    /** Trim whitespace */
    trim?: boolean;
    /** Remove null bytes */
    removeNullBytes?: boolean;
    /** Normalize Unicode */
    normalizeUnicode?: boolean;
    /** Remove control characters (except newline and tab) */
    removeControlChars?: boolean;
    /** Maximum length (truncate if exceeded) */
    maxLength?: number;
  } = {}
): string {
  const {
    stripHtml = false,
    trim = true,
    removeNullBytes = true,
    normalizeUnicode = true,
    removeControlChars = true,
    maxLength,
  } = options;

  let sanitized = value;

  // Remove null bytes (can cause issues in databases)
  if (removeNullBytes) {
    sanitized = sanitized.replace(/\0/g, '');
  }

  // Remove control characters (except newline \n and tab \t)
  if (removeControlChars) {
    sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  }

  // Strip HTML tags if requested
  if (stripHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }

  // Normalize Unicode to NFC form (canonical composition)
  if (normalizeUnicode) {
    sanitized = sanitized.normalize('NFC');
  }

  // Trim whitespace
  if (trim) {
    sanitized = sanitized.trim();
  }

  // Truncate if max length specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitizes an email address
 *
 * @param email - Email to sanitize
 * @returns Sanitized email or null if invalid
 *
 * @example
 * const clean = sanitizeEmail(userEmail);
 * if (!clean) return errorResponse('Invalid email');
 */
export function sanitizeEmail(email: string): string | null {
  // Trim and lowercase
  const cleaned = email.trim().toLowerCase();

  // Basic email format validation
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
  if (!emailRegex.test(cleaned)) {
    return null;
  }

  // Remove any remaining dangerous characters
  return sanitizeString(cleaned, {
    removeNullBytes: true,
    removeControlChars: true,
    maxLength: 254, // RFC 5321 email max length
  });
}

/**
 * Sanitizes a URL
 *
 * @param url - URL to sanitize
 * @param options - Sanitization options
 * @returns Sanitized URL or null if invalid
 *
 * @example
 * const clean = sanitizeUrl(userUrl, { httpsOnly: true });
 * if (!clean) return errorResponse('Invalid URL');
 */
export function sanitizeUrl(
  url: string,
  options: {
    /** Only allow HTTPS URLs */
    httpsOnly?: boolean;
    /** Allowed protocols */
    allowedProtocols?: string[];
    /** Maximum length */
    maxLength?: number;
  } = {}
): string | null {
  const { httpsOnly = false, allowedProtocols = ['http:', 'https:'], maxLength = 2048 } = options;

  const cleaned = sanitizeString(url, {
    trim: true,
    removeNullBytes: true,
    removeControlChars: true,
    maxLength,
  });

  try {
    const parsed = new URL(cleaned);

    // Check protocol
    if (httpsOnly && parsed.protocol !== 'https:') {
      return null;
    }

    if (!allowedProtocols.includes(parsed.protocol)) {
      return null;
    }

    // Reconstruct URL to normalize it
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitizes a UUID
 *
 * @param uuid - UUID to sanitize
 * @returns Sanitized UUID or null if invalid
 *
 * @example
 * const clean = sanitizeUUID(userId);
 * if (!clean) return errorResponse('Invalid user ID');
 */
export function sanitizeUUID(uuid: string): string | null {
  const cleaned = uuid.trim().toLowerCase();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return uuidRegex.test(cleaned) ? cleaned : null;
}

/**
 * Sanitizes an integer
 *
 * @param value - Value to sanitize
 * @param options - Sanitization options
 * @returns Sanitized integer or null if invalid
 *
 * @example
 * const clean = sanitizeInteger(userInput, { min: 0, max: 100 });
 * if (clean === null) return errorResponse('Invalid number');
 */
export function sanitizeInteger(
  value: unknown,
  options: {
    min?: number;
    max?: number;
  } = {}
): number | null {
  const { min, max } = options;

  // Convert to number
  const num = typeof value === 'string' ? parseInt(value, 10) : Number(value);

  // Check if valid integer
  if (!Number.isInteger(num) || isNaN(num)) {
    return null;
  }

  // Check range
  if (min !== undefined && num < min) {
    return null;
  }

  if (max !== undefined && num > max) {
    return null;
  }

  return num;
}

/**
 * Sanitizes a floating-point number
 *
 * @param value - Value to sanitize
 * @param options - Sanitization options
 * @returns Sanitized number or null if invalid
 *
 * @example
 * const clean = sanitizeNumber(userInput, { min: 0, max: 1 });
 * if (clean === null) return errorResponse('Invalid number');
 */
export function sanitizeNumber(
  value: unknown,
  options: {
    min?: number;
    max?: number;
    allowInfinity?: boolean;
    allowNaN?: boolean;
  } = {}
): number | null {
  const { min, max, allowInfinity = false, allowNaN = false } = options;

  // Convert to number
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);

  // Check for NaN
  if (isNaN(num)) {
    return allowNaN ? num : null;
  }

  // Check for Infinity
  if (!isFinite(num)) {
    return allowInfinity ? num : null;
  }

  // Check range
  if (min !== undefined && num < min) {
    return null;
  }

  if (max !== undefined && num > max) {
    return null;
  }

  return num;
}

/**
 * Sanitizes a boolean value
 *
 * @param value - Value to sanitize
 * @returns Boolean or null if invalid
 *
 * @example
 * const clean = sanitizeBoolean(userInput);
 * if (clean === null) return errorResponse('Invalid boolean');
 */
export function sanitizeBoolean(value: unknown): boolean | null {
  // Handle boolean type
  if (typeof value === 'boolean') {
    return value;
  }

  // Handle string representations
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'true' || lower === '1' || lower === 'yes') {
      return true;
    }
    if (lower === 'false' || lower === '0' || lower === 'no') {
      return false;
    }
  }

  // Handle number representations
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  return null;
}

/**
 * Sanitizes an object by applying sanitization to all string fields
 *
 * @param obj - Object to sanitize
 * @param options - Sanitization options
 * @returns Sanitized object
 *
 * @example
 * const clean = sanitizeObject(userInput, { stripHtml: true });
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: {
    stripHtml?: boolean;
    trim?: boolean;
    maxStringLength?: number;
  } = {}
): T {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value, {
        stripHtml: options.stripHtml,
        trim: options.trim,
        maxLength: options.maxStringLength,
      });
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>, options);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Removes SQL injection patterns from a string
 *
 * Note: This is a defense-in-depth measure. Always use parameterized queries!
 *
 * @param value - String to sanitize
 * @returns Sanitized string
 *
 * @example
 * const clean = removeSQLPatterns(userInput);
 */
export function removeSQLPatterns(value: string): string {
  // Remove common SQL injection patterns
  const patterns = [/('|(\\')|(--)|;|\/\*|\*\/|xp_|sp_|exec|execute|script|javascript|eval)/gi];

  let sanitized = value;
  for (const pattern of patterns) {
    sanitized = sanitized.replace(pattern, '');
  }

  return sanitized;
}

/**
 * Sanitizes a file name
 *
 * @param filename - Filename to sanitize
 * @param options - Sanitization options
 * @returns Sanitized filename
 *
 * @example
 * const clean = sanitizeFilename(userFilename);
 */
export function sanitizeFilename(
  filename: string,
  options: {
    /** Replace spaces with underscores */
    replaceSpaces?: boolean;
    /** Maximum length */
    maxLength?: number;
  } = {}
): string {
  const { replaceSpaces = true, maxLength = 255 } = options;

  let sanitized = filename;

  // Remove path traversal attempts
  sanitized = sanitized.replace(/\.\./g, '');
  sanitized = sanitized.replace(/[\/\\]/g, '');

  // Remove dangerous characters
  sanitized = sanitized.replace(/[<>:"|?*\x00-\x1F]/g, '');

  // Replace spaces if requested
  if (replaceSpaces) {
    sanitized = sanitized.replace(/\s+/g, '_');
  }

  // Normalize unicode
  sanitized = sanitized.normalize('NFC');

  // Trim dots and whitespace
  sanitized = sanitized.replace(/^\.+/, '').trim();

  // Truncate if too long (preserve extension if possible)
  if (sanitized.length > maxLength) {
    const ext = sanitized.match(/\.[^.]+$/)?.[0] || '';
    const nameLength = maxLength - ext.length;
    sanitized = sanitized.substring(0, nameLength) + ext;
  }

  return sanitized || 'untitled';
}

/**
 * Sanitization presets for common use cases
 */
export const SanitizationPresets = {
  /** Basic string sanitization (trim, remove dangerous chars) */
  basic: (value: string) =>
    sanitizeString(value, {
      trim: true,
      removeNullBytes: true,
      removeControlChars: true,
    }),

  /** User-generated content (strip HTML, aggressive cleaning) */
  userContent: (value: string) =>
    sanitizeString(value, {
      stripHtml: true,
      trim: true,
      removeNullBytes: true,
      removeControlChars: true,
      normalizeUnicode: true,
    }),

  /** Database input (remove SQL patterns, basic cleaning) */
  database: (value: string) => removeSQLPatterns(SanitizationPresets.basic(value)),

  /** Short text (titles, names) */
  shortText: (value: string) =>
    sanitizeString(value, {
      stripHtml: true,
      trim: true,
      removeNullBytes: true,
      removeControlChars: true,
      maxLength: 200,
    }),

  /** Long text (descriptions, prompts) */
  longText: (value: string) =>
    sanitizeString(value, {
      stripHtml: false,
      trim: true,
      removeNullBytes: true,
      removeControlChars: true,
      maxLength: 10000,
    }),
} as const;
