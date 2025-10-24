/**
 * API Validation Utilities (Backward Compatibility Wrapper)
 *
 * This file provides backward compatibility for routes still using the old validation API.
 * It wraps the canonical validation functions from @/lib/validation with a result-based API.
 *
 * MIGRATION STATUS:
 * - Canonical validation: @/lib/validation (assertion-based, throws ValidationError)
 * - This wrapper: @/lib/api/validation (result-based, returns ValidationError | null)
 * - Routes migrated: 2/17 (export, history)
 * - Routes pending: 15/17
 *
 * RECOMMENDED: Migrate routes to use @/lib/validation directly with try-catch blocks.
 *
 * @module lib/api/validation
 * @deprecated Use @/lib/validation directly for new code
 */

import {
  ValidationError as CanonicalValidationError,
  validateUUID as canonicalValidateUUID,
  validateEnum as canonicalValidateEnum,
  validateInteger as canonicalValidateInteger,
  validateNumber as canonicalValidateNumber,
  validateBoolean as canonicalValidateBoolean,
  validateUrl as canonicalValidateUrl,
  validateAspectRatio as canonicalValidateAspectRatio,
  validateDuration as canonicalValidateDuration,
  validateSeed as canonicalValidateSeed,
  validateSampleCount as canonicalValidateSampleCount,
  validateSafetyFilterLevel as canonicalValidateSafetyFilterLevel,
  validatePersonGeneration as canonicalValidatePersonGeneration,
  validateString as canonicalValidateString,
  VALID_ASPECT_RATIOS,
  VALID_DURATIONS,
  VALID_SAFETY_LEVELS,
  VALID_PERSON_GENERATION,
  URL_REGEX,
} from '@/lib/validation';

/**
 * Re-export constants
 */
export {
  VALID_ASPECT_RATIOS,
  VALID_DURATIONS,
  VALID_SAFETY_LEVELS,
  VALID_PERSON_GENERATION,
  URL_REGEX,
};

/**
 * UUID v4 regex pattern
 */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validation error type with field-specific information
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Wrapper helper to convert assertion-based validation to result-based
 */
function wrapValidation(validationFn: () => void): ValidationError | null {
  try {
    validationFn();
    return null;
  } catch (error) {
    if (error instanceof CanonicalValidationError) {
      return {
        field: error.field ?? 'unknown',
        message: error.message,
      };
    }
    throw error;
  }
}

/**
 * Validates a UUID format
 *
 * @param value - Value to validate
 * @param fieldName - Name of the field for error messages
 * @returns Validation error if invalid, null if valid
 */
export function validateUUID(value: unknown, fieldName: string = 'id'): ValidationError | null {
  return wrapValidation(() => canonicalValidateUUID(value, fieldName));
}

/**
 * Validates a string field with min/max length constraints
 *
 * @param value - Value to validate
 * @param fieldName - Name of the field for error messages
 * @param options - Validation options
 * @returns Validation error if invalid, null if valid
 */
export function validateString(
  value: unknown,
  fieldName: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
  } = {}
): ValidationError | null {
  return wrapValidation(() => canonicalValidateString(value, fieldName, options));
}

/**
 * Validates an integer with min/max constraints
 *
 * @param value - Value to validate
 * @param fieldName - Name of the field for error messages
 * @param options - Validation options
 * @returns Validation error if invalid, null if valid
 */
export function validateInteger(
  value: unknown,
  fieldName: string,
  options: {
    required?: boolean;
    min?: number;
    max?: number;
  } = {}
): ValidationError | null {
  return wrapValidation(() => canonicalValidateInteger(value, fieldName, options));
}

/**
 * Validates an enum value
 *
 * @param value - Value to validate
 * @param fieldName - Name of the field for error messages
 * @param allowedValues - Array of allowed values
 * @param required - Whether the field is required
 * @returns Validation error if invalid, null if valid
 */
export function validateEnum(
  value: unknown,
  fieldName: string,
  allowedValues: readonly string[],
  required: boolean = false
): ValidationError | null {
  if (!required && (value === undefined || value === null || value === '')) {
    return null;
  }
  return wrapValidation(() => canonicalValidateEnum(value, fieldName, allowedValues));
}

/**
 * Validates aspect ratio
 *
 * @param aspectRatio - Aspect ratio to validate
 * @returns Validation error if invalid, null if valid
 */
export function validateAspectRatio(aspectRatio: unknown): ValidationError | null {
  if (aspectRatio === undefined || aspectRatio === null) {
    return null;
  }
  return wrapValidation(() => canonicalValidateAspectRatio(aspectRatio));
}

/**
 * Validates video duration
 *
 * @param duration - Duration to validate
 * @returns Validation error if invalid, null if valid
 */
export function validateDuration(duration: unknown): ValidationError | null {
  if (duration === undefined || duration === null) {
    return null;
  }
  return wrapValidation(() => canonicalValidateDuration(duration));
}

/**
 * Validates seed value (0-4294967295)
 *
 * @param seed - Seed to validate
 * @returns Validation error if invalid, null if valid
 */
export function validateSeed(seed: unknown): ValidationError | null {
  if (seed === undefined || seed === null) {
    return null;
  }
  return wrapValidation(() => canonicalValidateSeed(seed));
}

/**
 * Validates sample count (1-8 for images, 1-4 for videos)
 *
 * @param sampleCount - Sample count to validate
 * @param max - Maximum sample count
 * @returns Validation error if invalid, null if valid
 */
export function validateSampleCount(sampleCount: unknown, max: number = 8): ValidationError | null {
  if (sampleCount === undefined || sampleCount === null) {
    return null;
  }
  return wrapValidation(() => canonicalValidateSampleCount(sampleCount, max));
}

/**
 * Validates safety filter level
 *
 * @param safetyFilterLevel - Safety filter level to validate
 * @returns Validation error if invalid, null if valid
 */
export function validateSafetyFilterLevel(safetyFilterLevel: unknown): ValidationError | null {
  if (safetyFilterLevel === undefined || safetyFilterLevel === null) {
    return null;
  }
  return wrapValidation(() => canonicalValidateSafetyFilterLevel(safetyFilterLevel));
}

/**
 * Validates person generation option
 *
 * @param personGeneration - Person generation option to validate
 * @returns Validation error if invalid, null if valid
 */
export function validatePersonGeneration(personGeneration: unknown): ValidationError | null {
  if (personGeneration === undefined || personGeneration === null) {
    return null;
  }
  return wrapValidation(() => canonicalValidatePersonGeneration(personGeneration));
}

/**
 * Validates a URL format
 *
 * @param value - Value to validate
 * @param fieldName - Name of the field for error messages
 * @param options - Validation options
 * @returns Validation error if invalid, null if valid
 */
export function validateUrl(
  value: unknown,
  fieldName: string,
  options: {
    required?: boolean;
    httpsOnly?: boolean;
    maxLength?: number;
  } = {}
): ValidationError | null {
  const { required = false } = options;
  if (!required && (value === undefined || value === null || value === '')) {
    return null;
  }
  return wrapValidation(() => canonicalValidateUrl(value, fieldName, options));
}

/**
 * Validates a number with min/max constraints
 *
 * @param value - Value to validate
 * @param fieldName - Name of the field for error messages
 * @param options - Validation options
 * @returns Validation error if invalid, null if valid
 */
export function validateNumber(
  value: unknown,
  fieldName: string,
  options: {
    required?: boolean;
    min?: number;
    max?: number;
  } = {}
): ValidationError | null {
  const { required = false } = options;
  if (!required && (value === undefined || value === null)) {
    return null;
  }
  return wrapValidation(() => canonicalValidateNumber(value, fieldName, options.min, options.max));
}

/**
 * Validates a boolean value
 *
 * @param value - Value to validate
 * @param fieldName - Name of the field for error messages
 * @param required - Whether the field is required
 * @returns Validation error if invalid, null if valid
 */
export function validateBoolean(
  value: unknown,
  fieldName: string,
  required: boolean = false
): ValidationError | null {
  if (!required && (value === undefined || value === null)) {
    return null;
  }
  return wrapValidation(() => canonicalValidateBoolean(value, fieldName));
}

/**
 * Batch validation helper
 * Runs multiple validations and collects all errors
 *
 * @param validations - Array of validation functions that return ValidationError | null
 * @returns ValidationResult with all errors
 */
export function validateAll(
  validations: (
    | ValidationError
    | null
    | {
        valid: boolean;
        field?: string;
        message?: string;
        errors?: { field?: string; message?: string }[];
      }
  )[]
): ValidationResult {
  const errors: ValidationError[] = [];

  for (const result of validations) {
    if (!result) {
      continue;
    }

    if (typeof (result as { valid?: boolean }).valid === 'boolean') {
      const validationResult = result as {
        valid: boolean;
        field?: string;
        message?: string;
        errors?: { field?: string; message?: string }[];
      };

      if (!validationResult.valid) {
        if (Array.isArray(validationResult.errors) && validationResult.errors.length > 0) {
          validationResult.errors.forEach((item) => {
            errors.push({
              field: item.field ?? validationResult.field ?? 'unknown',
              message: item.message ?? validationResult.message ?? 'Invalid input',
            });
          });
        } else {
          errors.push({
            field: validationResult.field ?? 'unknown',
            message: validationResult.message ?? 'Invalid input',
          });
        }
      }

      continue;
    }

    errors.push(result as ValidationError);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
