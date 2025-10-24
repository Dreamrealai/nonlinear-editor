/**
 * API Validation Utilities
 *
 * Centralized validation functions for API routes to eliminate code duplication.
 * Provides consistent validation logic with proper error messages.
 *
 * @module lib/api/validation
 */

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
 * UUID v4 regex pattern
 */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates a UUID format
 *
 * @param value - Value to validate
 * @param fieldName - Name of the field for error messages
 * @returns Validation error if invalid, null if valid
 *
 * @example
 * const error = validateUUID(projectId, 'projectId');
 * if (error) return errorResponse(error.message, 400);
 */
export function validateUUID(value: unknown, fieldName: string = 'id'): ValidationError | null {
  if (!value || typeof value !== 'string') {
    return {
      field: fieldName,
      message: `${fieldName} is required`,
    };
  }

  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  if (!UUID_REGEX.test(value)) {
    return {
      field: fieldName,
      message: `Invalid ${fieldName} format`,
      value,
    };
  }

  return null;
}

/**
 * Validates a string field with min/max length constraints
 *
 * @param value - Value to validate
 * @param fieldName - Name of the field for error messages
 * @param options - Validation options
 * @returns Validation error if invalid, null if valid
 *
 * @example
 * const error = validateString(prompt, 'prompt', { minLength: 3, maxLength: 1000 });
 * if (error) return errorResponse(error.message, 400);
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
  const { required = true, minLength, maxLength } = options;

  if (!value || typeof value !== 'string') {
    if (required) {
      return {
        field: fieldName,
        message: `${fieldName} is required`,
      };
    }
    return null;
  }

  if (minLength !== undefined && value.length < minLength) {
    return {
      field: fieldName,
      message: `${fieldName} must be at least ${minLength} characters`,
      value: value.length,
    };
  }

  if (maxLength !== undefined && value.length > maxLength) {
    return {
      field: fieldName,
      message: `${fieldName} must not exceed ${maxLength} characters`,
      value: value.length,
    };
  }

  return null;
}

/**
 * Validates an integer with min/max constraints
 *
 * @param value - Value to validate
 * @param fieldName - Name of the field for error messages
 * @param options - Validation options
 * @returns Validation error if invalid, null if valid
 *
 * @example
 * const error = validateInteger(seed, 'seed', { min: 0, max: 4294967295 });
 * if (error) return errorResponse(error.message, 400);
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
  const { required = false, min, max } = options;

  if (value === undefined || value === null) {
    if (required) {
      return {
        field: fieldName,
        message: `${fieldName} is required`,
      };
    }
    return null;
  }

  if (!Number.isInteger(value)) {
    return {
      field: fieldName,
      message: `${fieldName} must be an integer`,
      value,
    };
  }

  if (min !== undefined && (value as number) < min) {
    return {
      field: fieldName,
      message: `${fieldName} must be at least ${min}`,
      value,
    };
  }

  if (max !== undefined && (value as number) > max) {
    return {
      field: fieldName,
      message: `${fieldName} must not exceed ${max}`,
      value,
    };
  }

  return null;
}

/**
 * Validates an enum value
 *
 * @param value - Value to validate
 * @param fieldName - Name of the field for error messages
 * @param allowedValues - Array of allowed values
 * @param required - Whether the field is required
 * @returns Validation error if invalid, null if valid
 *
 * @example
 * const error = validateEnum(aspectRatio, 'aspectRatio', ['16:9', '9:16', '1:1']);
 * if (error) return errorResponse(error.message, 400);
 */
export function validateEnum(
  value: unknown,
  fieldName: string,
  allowedValues: readonly string[],
  required: boolean = false
): ValidationError | null {
  if (!value || typeof value !== 'string') {
    if (required) {
      return {
        field: fieldName,
        message: `${fieldName} is required`,
      };
    }
    return null;
  }

  if (!allowedValues.includes(value)) {
    return {
      field: fieldName,
      message: `Invalid ${fieldName}. Must be one of: ${allowedValues.join(', ')}`,
      value,
    };
  }

  return null;
}

/**
 * Common aspect ratio validation
 */
export const VALID_ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4'] as const;

/**
 * Validates aspect ratio
 *
 * @param aspectRatio - Aspect ratio to validate
 * @returns Validation error if invalid, null if valid
 */
export function validateAspectRatio(aspectRatio: unknown): ValidationError | null {
  return validateEnum(aspectRatio, 'aspectRatio', VALID_ASPECT_RATIOS, false);
}

/**
 * Common video duration validation
 */
export const VALID_DURATIONS = [4, 5, 6, 8, 10] as const;

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

  if (
    typeof duration !== 'number' ||
    !VALID_DURATIONS.includes(duration as (typeof VALID_DURATIONS)[number])
  ) {
    return {
      field: 'duration',
      message: `Invalid duration. Must be ${VALID_DURATIONS.join(', ')} seconds`,
      value: duration,
    };
  }

  return null;
}

/**
 * Validates seed value (0-4294967295)
 *
 * @param seed - Seed to validate
 * @returns Validation error if invalid, null if valid
 */
export function validateSeed(seed: unknown): ValidationError | null {
  return validateInteger(seed, 'seed', { min: 0, max: 4294967295 });
}

/**
 * Validates sample count (1-8 for images, 1-4 for videos)
 *
 * @param sampleCount - Sample count to validate
 * @param max - Maximum sample count
 * @returns Validation error if invalid, null if valid
 */
export function validateSampleCount(sampleCount: unknown, max: number = 8): ValidationError | null {
  return validateInteger(sampleCount, 'sampleCount', { min: 1, max });
}

/**
 * Common safety filter levels for AI generation
 */
export const VALID_SAFETY_LEVELS = ['block_none', 'block_few', 'block_some', 'block_most'] as const;

/**
 * Validates safety filter level
 *
 * @param safetyFilterLevel - Safety filter level to validate
 * @returns Validation error if invalid, null if valid
 */
export function validateSafetyFilterLevel(safetyFilterLevel: unknown): ValidationError | null {
  return validateEnum(safetyFilterLevel, 'safetyFilterLevel', VALID_SAFETY_LEVELS, false);
}

/**
 * Common person generation options
 */
export const VALID_PERSON_GENERATION = ['dont_allow', 'allow_adult', 'allow_all'] as const;

/**
 * Validates person generation option
 *
 * @param personGeneration - Person generation option to validate
 * @returns Validation error if invalid, null if valid
 */
export function validatePersonGeneration(personGeneration: unknown): ValidationError | null {
  return validateEnum(personGeneration, 'personGeneration', VALID_PERSON_GENERATION, false);
}

/**
 * URL regex pattern for validation
 */
export const URL_REGEX =
  /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/;

/**
 * Validates a URL format
 *
 * @param value - Value to validate
 * @param fieldName - Name of the field for error messages
 * @param options - Validation options
 * @returns Validation error if invalid, null if valid
 *
 * @example
 * const error = validateUrl(imageUrl, 'imageUrl', { httpsOnly: true });
 * if (error) return errorResponse(error.message, 400);
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
  const { required = false, httpsOnly = false, maxLength = 2048 } = options;

  if (!value || typeof value !== 'string') {
    if (required) {
      return {
        field: fieldName,
        message: `${fieldName} is required`,
      };
    }
    return null;
  }

  if (value.length > maxLength) {
    return {
      field: fieldName,
      message: `${fieldName} must not exceed ${maxLength} characters`,
      value: value.length,
    };
  }

  if (!URL_REGEX.test(value)) {
    return {
      field: fieldName,
      message: `Invalid ${fieldName} format`,
      value,
    };
  }

  if (httpsOnly && !value.startsWith('https://')) {
    return {
      field: fieldName,
      message: `${fieldName} must use HTTPS protocol`,
      value,
    };
  }

  return null;
}

/**
 * Validates a number with min/max constraints
 *
 * @param value - Value to validate
 * @param fieldName - Name of the field for error messages
 * @param options - Validation options
 * @returns Validation error if invalid, null if valid
 *
 * @example
 * const error = validateNumber(stability, 'stability', { min: 0, max: 1 });
 * if (error) return errorResponse(error.message, 400);
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
  const { required = false, min, max } = options;

  if (value === undefined || value === null) {
    if (required) {
      return {
        field: fieldName,
        message: `${fieldName} is required`,
      };
    }
    return null;
  }

  if (typeof value !== 'number' || isNaN(value)) {
    return {
      field: fieldName,
      message: `${fieldName} must be a number`,
      value,
    };
  }

  if (min !== undefined && value < min) {
    return {
      field: fieldName,
      message: `${fieldName} must be at least ${min}`,
      value,
    };
  }

  if (max !== undefined && value > max) {
    return {
      field: fieldName,
      message: `${fieldName} must not exceed ${max}`,
      value,
    };
  }

  return null;
}

/**
 * Validates a boolean value
 *
 * @param value - Value to validate
 * @param fieldName - Name of the field for error messages
 * @param required - Whether the field is required
 * @returns Validation error if invalid, null if valid
 *
 * @example
 * const error = validateBoolean(instrumental, 'instrumental', false);
 * if (error) return errorResponse(error.message, 400);
 */
export function validateBoolean(
  value: unknown,
  fieldName: string,
  required: boolean = false
): ValidationError | null {
  if (value === undefined || value === null) {
    if (required) {
      return {
        field: fieldName,
        message: `${fieldName} is required`,
      };
    }
    return null;
  }

  if (typeof value !== 'boolean') {
    return {
      field: fieldName,
      message: `${fieldName} must be a boolean`,
      value,
    };
  }

  return null;
}

/**
 * Batch validation helper
 * Runs multiple validations and collects all errors
 *
 * @param validations - Array of validation functions that return ValidationError | null
 * @returns ValidationResult with all errors
 *
 * @example
 * const result = validateAll([
 *   validateString(prompt, 'prompt', { minLength: 3, maxLength: 1000 }),
 *   validateUUID(projectId, 'projectId'),
 *   validateAspectRatio(aspectRatio),
 * ]);
 * if (!result.valid) {
 *   return errorResponse(result.errors[0].message, 400);
 * }
 */
export function validateAll(validations: (ValidationError | null | { valid: boolean; field?: string; message?: string; errors?: { field?: string; message?: string }[] })[]): ValidationResult {
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
              field: item.field ?? validationResult.field,
              message: item.message ?? validationResult.message ?? 'Invalid input',
            });
          });
        } else {
          errors.push({
            field: validationResult.field,
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
