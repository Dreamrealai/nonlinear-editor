/**
 * Validation utilities for API routes and services
 *
 * Provides reusable validation functions for common patterns:
 * - UUID validation
 * - String length validation
 * - Enum validation
 * - Number range validation
 *
 * Usage:
 * ```typescript
 * import { validateUUID, validateStringLength, ValidationError } from '@/lib/validation';
 *
 * validateUUID(projectId, 'Project ID');
 * validateStringLength(prompt, 'Prompt', 3, 1000);
 * ```
 */

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate UUID format
 */
export function validateUUID(value: unknown, fieldName: string = 'ID'): asserts value is string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`, fieldName, 'INVALID_TYPE');
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new ValidationError(`Invalid ${fieldName} format`, fieldName, 'INVALID_UUID');
  }
}

/**
 * Validate string length
 */
export function validateStringLength(
  value: unknown,
  fieldName: string,
  minLength: number,
  maxLength: number
): asserts value is string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`, fieldName, 'INVALID_TYPE');
  }

  if (value.length < minLength) {
    throw new ValidationError(
      `${fieldName} must be at least ${minLength} characters`,
      fieldName,
      'TOO_SHORT'
    );
  }

  if (value.length > maxLength) {
    throw new ValidationError(
      `${fieldName} must not exceed ${maxLength} characters`,
      fieldName,
      'TOO_LONG'
    );
  }
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly T[]
): asserts value is T {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`, fieldName, 'INVALID_TYPE');
  }

  if (!allowedValues.includes(value as T)) {
    throw new ValidationError(
      `Invalid ${fieldName}. Must be one of: ${allowedValues.join(', ')}`,
      fieldName,
      'INVALID_ENUM'
    );
  }
}

/**
 * Validate integer in range
 */
export function validateIntegerRange(
  value: unknown,
  fieldName: string,
  min: number,
  max: number
): asserts value is number {
  if (typeof value !== 'number') {
    throw new ValidationError(`${fieldName} must be a number`, fieldName, 'INVALID_TYPE');
  }

  if (!Number.isInteger(value)) {
    throw new ValidationError(`${fieldName} must be an integer`, fieldName, 'NOT_INTEGER');
  }

  if (value < min || value > max) {
    throw new ValidationError(
      `${fieldName} must be between ${min} and ${max}`,
      fieldName,
      'OUT_OF_RANGE'
    );
  }
}

/**
 * Validate integer with options (backward compatible wrapper)
 *
 * @param value - Value to validate
 * @param fieldName - Field name for error messages
 * @param options - Validation options
 */
export function validateInteger(
  value: unknown,
  fieldName: string,
  options: {
    required?: boolean;
    min?: number;
    max?: number;
  } = {}
): asserts value is number {
  const { required = false, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = options;

  // Handle required validation
  if (required && (value === null || value === undefined)) {
    throw new ValidationError(`${fieldName} is required`, fieldName, 'REQUIRED');
  }

  // If not required and value is null/undefined, pass validation
  if (!required && (value === null || value === undefined)) {
    return;
  }

  // Validate type
  if (typeof value !== 'number') {
    throw new ValidationError(`${fieldName} must be a number`, fieldName, 'INVALID_TYPE');
  }

  if (!Number.isInteger(value)) {
    throw new ValidationError(`${fieldName} must be an integer`, fieldName, 'NOT_INTEGER');
  }

  // Validate range
  if (value < min || value > max) {
    throw new ValidationError(
      `${fieldName} must be between ${min} and ${max}`,
      fieldName,
      'OUT_OF_RANGE'
    );
  }
}

/**
 * Validate required field
 */
export function validateRequired<T>(
  value: T | null | undefined,
  fieldName: string
): asserts value is T {
  if (value === null || value === undefined || value === '') {
    throw new ValidationError(`${fieldName} is required`, fieldName, 'REQUIRED');
  }
}

/**
 * Validate MIME type
 */
export function validateMimeType(
  mimeType: string,
  allowedTypes: string[],
  fieldName: string = 'File type'
): void {
  if (!allowedTypes.includes(mimeType)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedTypes.join(', ')}`,
      fieldName,
      'INVALID_MIME_TYPE'
    );
  }
}

/**
 * Validate file size
 */
export function validateFileSize(
  size: number,
  maxSize: number,
  fieldName: string = 'File size'
): void {
  if (size > maxSize) {
    const maxSizeMB = (maxSize / 1024 / 1024).toFixed(2);
    throw new ValidationError(
      `${fieldName} exceeds maximum allowed size of ${maxSizeMB}MB`,
      fieldName,
      'FILE_TOO_LARGE'
    );
  }
}

/**
 * Image generation validation
 */
export const IMAGE_GENERATION_VALIDATORS = {
  aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'] as const,
  safetyFilterLevels: ['block_none', 'block_few', 'block_some', 'block_most'] as const,
  personGeneration: ['dont_allow', 'allow_adult', 'allow_all'] as const,
  promptMinLength: 3,
  promptMaxLength: 1000,
  sampleCountMin: 1,
  sampleCountMax: 8,
  seedMin: 0,
  seedMax: 4294967295,
};

/**
 * Validate URL format
 */
export const URL_REGEX =
  /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/;

export function validateUrl(
  value: unknown,
  fieldName: string = 'URL',
  options: {
    httpsOnly?: boolean;
    maxLength?: number;
  } = {}
): asserts value is string {
  const { httpsOnly = false, maxLength = 2048 } = options;

  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`, fieldName, 'INVALID_TYPE');
  }

  if (value.length > maxLength) {
    throw new ValidationError(
      `${fieldName} must not exceed ${maxLength} characters`,
      fieldName,
      'TOO_LONG'
    );
  }

  if (!URL_REGEX.test(value)) {
    throw new ValidationError(`Invalid ${fieldName} format`, fieldName, 'INVALID_URL');
  }

  if (httpsOnly && !value.startsWith('https://')) {
    throw new ValidationError(`${fieldName} must use HTTPS protocol`, fieldName, 'HTTPS_REQUIRED');
  }
}

/**
 * Validate number (not necessarily integer)
 */
export function validateNumber(
  value: unknown,
  fieldName: string,
  min?: number,
  max?: number
): asserts value is number {
  if (typeof value !== 'number') {
    throw new ValidationError(`${fieldName} must be a number`, fieldName, 'INVALID_TYPE');
  }

  if (isNaN(value)) {
    throw new ValidationError(`${fieldName} must be a valid number`, fieldName, 'INVALID_NUMBER');
  }

  if (min !== undefined && value < min) {
    throw new ValidationError(`${fieldName} must be at least ${min}`, fieldName, 'OUT_OF_RANGE');
  }

  if (max !== undefined && value > max) {
    throw new ValidationError(`${fieldName} must not exceed ${max}`, fieldName, 'OUT_OF_RANGE');
  }
}

/**
 * Validate boolean
 */
export function validateBoolean(value: unknown, fieldName: string): asserts value is boolean {
  if (typeof value !== 'boolean') {
    throw new ValidationError(`${fieldName} must be a boolean`, fieldName, 'INVALID_TYPE');
  }
}

/**
 * Common aspect ratio validation
 */
export const VALID_ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4'] as const;

/**
 * Common video duration validation
 */
export const VALID_DURATIONS = [4, 5, 6, 8, 10] as const;

/**
 * Common safety filter levels for AI generation
 */
export const VALID_SAFETY_LEVELS = ['block_none', 'block_few', 'block_some', 'block_most'] as const;

/**
 * Common person generation options
 */
export const VALID_PERSON_GENERATION = ['dont_allow', 'allow_adult', 'allow_all'] as const;

/**
 * Validates aspect ratio
 */
export function validateAspectRatio(aspectRatio: unknown, fieldName: string = 'Aspect ratio'): void {
  if (aspectRatio === undefined || aspectRatio === null) {
    return;
  }
  validateEnum(aspectRatio, fieldName, VALID_ASPECT_RATIOS);
}

/**
 * Validates video duration
 */
export function validateDuration(duration: unknown, fieldName: string = 'Duration'): void {
  if (duration === undefined || duration === null) {
    return;
  }

  if (typeof duration !== 'number') {
    throw new ValidationError(`${fieldName} must be a number`, fieldName, 'INVALID_TYPE');
  }

  if (!VALID_DURATIONS.includes(duration as (typeof VALID_DURATIONS)[number])) {
    throw new ValidationError(
      `Invalid ${fieldName}. Must be ${VALID_DURATIONS.join(', ')} seconds`,
      fieldName,
      'INVALID_DURATION'
    );
  }
}

/**
 * Validates seed value (0-4294967295)
 */
export function validateSeed(seed: unknown, fieldName: string = 'Seed'): void {
  if (seed === undefined || seed === null) {
    return;
  }
  validateIntegerRange(seed, fieldName, 0, 4294967295);
}

/**
 * Validates sample count (1-8 for images, 1-4 for videos)
 */
export function validateSampleCount(
  sampleCount: unknown,
  max: number = 8,
  fieldName: string = 'Sample count'
): void {
  if (sampleCount === undefined || sampleCount === null) {
    return;
  }
  validateIntegerRange(sampleCount, fieldName, 1, max);
}

/**
 * Validates safety filter level
 */
export function validateSafetyFilterLevel(
  safetyFilterLevel: unknown,
  fieldName: string = 'Safety filter level'
): void {
  if (safetyFilterLevel === undefined || safetyFilterLevel === null) {
    return;
  }
  validateEnum(safetyFilterLevel, fieldName, VALID_SAFETY_LEVELS);
}

/**
 * Validates person generation option
 */
export function validatePersonGeneration(
  personGeneration: unknown,
  fieldName: string = 'Person generation'
): void {
  if (personGeneration === undefined || personGeneration === null) {
    return;
  }
  validateEnum(personGeneration, fieldName, VALID_PERSON_GENERATION);
}

/**
 * Validate string with flexible options (simpler API)
 */
export function validateString(
  value: unknown,
  fieldName: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
  } = {}
): void {
  const { required = true, minLength, maxLength } = options;

  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new ValidationError(`${fieldName} is required`, fieldName, 'REQUIRED');
    }
    return;
  }

  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`, fieldName, 'INVALID_TYPE');
  }

  if (minLength !== undefined && value.length < minLength) {
    throw new ValidationError(
      `${fieldName} must be at least ${minLength} characters`,
      fieldName,
      'TOO_SHORT'
    );
  }

  if (maxLength !== undefined && value.length > maxLength) {
    throw new ValidationError(
      `${fieldName} must not exceed ${maxLength} characters`,
      fieldName,
      'TOO_LONG'
    );
  }
}

/**
 * Batch validation helper
 * Runs multiple validation functions and throws on the first error
 *
 * @param validations - Array of validation functions to run
 * @throws {ValidationError} Throws the first validation error encountered
 *
 * @example
 * validateAll(() => {
 *   validateString(prompt, 'prompt', { minLength: 3, maxLength: 1000 });
 *   validateUUID(projectId, 'projectId');
 *   validateAspectRatio(aspectRatio);
 * });
 */
export function validateAll(validationFn: () => void): void {
  validationFn();
}

/**
 * Validate image generation request
 */
export interface ImageGenerationRequest {
  prompt: string;
  projectId: string;
  aspectRatio?: string;
  negativePrompt?: string;
  sampleCount?: number;
  seed?: number;
  safetyFilterLevel?: string;
  personGeneration?: string;
  model?: string;
  addWatermark?: boolean;
  language?: string;
  outputMimeType?: string;
}

export function validateImageGenerationRequest(
  body: unknown
): asserts body is ImageGenerationRequest {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be an object', undefined, 'INVALID_BODY');
  }

  const req = body as Partial<ImageGenerationRequest>;

  // Required fields
  validateRequired(req.prompt, 'Prompt');
  validateStringLength(
    req.prompt,
    'Prompt',
    IMAGE_GENERATION_VALIDATORS.promptMinLength,
    IMAGE_GENERATION_VALIDATORS.promptMaxLength
  );

  validateRequired(req.projectId, 'Project ID');
  validateUUID(req.projectId, 'Project ID');

  // Optional fields
  if (req.aspectRatio !== undefined) {
    validateEnum(req.aspectRatio, 'Aspect ratio', IMAGE_GENERATION_VALIDATORS.aspectRatios);
  }

  if (req.negativePrompt !== undefined) {
    validateStringLength(
      req.negativePrompt,
      'Negative prompt',
      0,
      IMAGE_GENERATION_VALIDATORS.promptMaxLength
    );
  }

  if (req.sampleCount !== undefined) {
    validateIntegerRange(
      req.sampleCount,
      'Sample count',
      IMAGE_GENERATION_VALIDATORS.sampleCountMin,
      IMAGE_GENERATION_VALIDATORS.sampleCountMax
    );
  }

  if (req.seed !== undefined) {
    validateIntegerRange(
      req.seed,
      'Seed',
      IMAGE_GENERATION_VALIDATORS.seedMin,
      IMAGE_GENERATION_VALIDATORS.seedMax
    );
  }

  if (req.safetyFilterLevel !== undefined) {
    validateEnum(
      req.safetyFilterLevel,
      'Safety filter level',
      IMAGE_GENERATION_VALIDATORS.safetyFilterLevels
    );
  }

  if (req.personGeneration !== undefined) {
    validateEnum(
      req.personGeneration,
      'Person generation',
      IMAGE_GENERATION_VALIDATORS.personGeneration
    );
  }
}
