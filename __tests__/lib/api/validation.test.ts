/**
 * Comprehensive tests for API validation utilities
 */

import {
  validateString,
  validateUUID,
  validateInteger,
  validateEnum,
  validateAspectRatio,
  validateDuration,
  validateSeed,
  validateSampleCount,
  validateSafetyFilterLevel,
  validatePersonGeneration,
  validateAll,
  UUID_REGEX,
  VALID_ASPECT_RATIOS,
  VALID_DURATIONS,
  VALID_SAFETY_LEVELS,
  VALID_PERSON_GENERATION,
} from '@/lib/api/validation';

describe('API Validation Utilities', () => {
  describe('validateString', () => {
    it('should pass for valid string within length bounds', () => {
      const result = validateString('hello', 'name', { minLength: 1, maxLength: 10 });
      expect(result).toBeNull();
    });

    it('should pass for string at minimum length', () => {
      const result = validateString('abc', 'name', { minLength: 3 });
      expect(result).toBeNull();
    });

    it('should pass for string at maximum length', () => {
      const result = validateString('1234567890', 'name', { maxLength: 10 });
      expect(result).toBeNull();
    });

    it('should fail for string below minimum length', () => {
      const result = validateString('ab', 'name', { minLength: 3 });
      expect(result).not.toBeNull();
      expect(result?.field).toBe('name');
      expect(result?.message).toContain('at least 3 characters');
    });

    it('should fail for string above maximum length', () => {
      const result = validateString('12345678901', 'name', { maxLength: 10 });
      expect(result).not.toBeNull();
      expect(result?.field).toBe('name');
      expect(result?.message).toContain('not exceed 10 characters');
    });

    it('should fail for non-string when required', () => {
      const result = validateString(123, 'name', { required: true });
      expect(result).not.toBeNull();
      expect(result?.message).toContain('is required');
    });

    it('should pass for non-string when not required', () => {
      const result = validateString(undefined, 'name', { required: false });
      expect(result).toBeNull();
    });

    it('should fail for empty string when required', () => {
      const result = validateString('', 'name', { required: true });
      expect(result).not.toBeNull();
      expect(result?.message).toContain('is required');
    });

    it('should handle missing options', () => {
      const result = validateString('test', 'name');
      expect(result).toBeNull();
    });
  });

  describe('validateUUID', () => {
    const validUUIDs = [
      '550e8400-e29b-41d4-a716-446655440000',
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      '6ba7b810-9dad-41d1-80b4-00c04fd430c8', // UUID v4 format
    ];

    const invalidUUIDs = [
      'invalid-uuid',
      '550e8400-e29b-41d4',
      '550e8400-e29b-51d4-a716-446655440000', // Invalid version (5 instead of 4)
      '550e8400e29b41d4a716446655440000', // Missing dashes
      'g50e8400-e29b-41d4-a716-446655440000', // Invalid hex
    ];

    it('should pass for valid UUIDs', () => {
      validUUIDs.forEach((uuid) => {
        const result = validateUUID(uuid, 'id');
        expect(result).toBeNull();
      });
    });

    it('should fail for invalid UUID formats', () => {
      invalidUUIDs.forEach((uuid) => {
        const result = validateUUID(uuid, 'id');
        expect(result).not.toBeNull();
        expect(result?.field).toBe('id');
        expect(result?.message).toContain('Invalid id format');
      });
    });

    it('should fail for non-string values', () => {
      const result = validateUUID(123, 'id');
      expect(result).not.toBeNull();
      expect(result?.message).toContain('is required');
    });

    it('should fail for null', () => {
      const result = validateUUID(null, 'id');
      expect(result).not.toBeNull();
    });

    it('should fail for undefined', () => {
      const result = validateUUID(undefined, 'id');
      expect(result).not.toBeNull();
    });

    it('should use custom field name in error', () => {
      const result = validateUUID('invalid', 'projectId');
      expect(result?.field).toBe('projectId');
      expect(result?.message).toContain('projectId');
    });
  });

  describe('validateInteger', () => {
    it('should pass for valid integer within bounds', () => {
      const result = validateInteger(5, 'count', { min: 1, max: 10 });
      expect(result).toBeNull();
    });

    it('should pass for integer at minimum', () => {
      const result = validateInteger(1, 'count', { min: 1, max: 10 });
      expect(result).toBeNull();
    });

    it('should pass for integer at maximum', () => {
      const result = validateInteger(10, 'count', { min: 1, max: 10 });
      expect(result).toBeNull();
    });

    it('should fail for integer below minimum', () => {
      const result = validateInteger(0, 'count', { min: 1 });
      expect(result).not.toBeNull();
      expect(result?.message).toContain('at least 1');
    });

    it('should fail for integer above maximum', () => {
      const result = validateInteger(11, 'count', { max: 10 });
      expect(result).not.toBeNull();
      expect(result?.message).toContain('not exceed 10');
    });

    it('should fail for non-integer (float)', () => {
      const result = validateInteger(5.5, 'count');
      expect(result).not.toBeNull();
      expect(result?.message).toContain('must be an integer');
    });

    it('should fail for non-integer when required', () => {
      const result = validateInteger('5', 'count', { required: true });
      expect(result).not.toBeNull();
    });

    it('should pass for undefined when not required', () => {
      const result = validateInteger(undefined, 'count', { required: false });
      expect(result).toBeNull();
    });

    it('should pass for null when not required', () => {
      const result = validateInteger(null, 'count', { required: false });
      expect(result).toBeNull();
    });

    it('should fail for null when required', () => {
      const result = validateInteger(null, 'count', { required: true });
      expect(result).not.toBeNull();
      expect(result?.message).toContain('is required');
    });

    it('should handle zero correctly', () => {
      const result = validateInteger(0, 'count', { min: 0, max: 10 });
      expect(result).toBeNull();
    });

    it('should handle negative integers', () => {
      const result = validateInteger(-5, 'count', { min: -10, max: 0 });
      expect(result).toBeNull();
    });
  });

  describe('validateEnum', () => {
    const allowedValues = ['option1', 'option2', 'option3'] as const;

    it('should pass for valid enum values', () => {
      allowedValues.forEach((value) => {
        const result = validateEnum(value, 'field', allowedValues);
        expect(result).toBeNull();
      });
    });

    it('should fail for invalid enum value', () => {
      const result = validateEnum('invalid', 'field', allowedValues);
      expect(result).not.toBeNull();
      expect(result?.message).toContain('Must be one of');
      expect(result?.message).toContain('option1');
    });

    it('should fail for non-string when required', () => {
      const result = validateEnum(123, 'field', allowedValues, true);
      expect(result).not.toBeNull();
      expect(result?.message).toContain('is required');
    });

    it('should pass for non-string when not required', () => {
      const result = validateEnum(null, 'field', allowedValues, false);
      expect(result).toBeNull();
    });

    it('should be case-sensitive', () => {
      const result = validateEnum('OPTION1', 'field', allowedValues);
      expect(result).not.toBeNull();
    });
  });

  describe('validateAspectRatio', () => {
    it('should pass for valid aspect ratios', () => {
      VALID_ASPECT_RATIOS.forEach((ratio) => {
        const result = validateAspectRatio(ratio);
        expect(result).toBeNull();
      });
    });

    it('should fail for invalid aspect ratio', () => {
      const result = validateAspectRatio('21:9');
      expect(result).not.toBeNull();
      expect(result?.field).toBe('aspectRatio');
    });

    it('should pass for undefined (optional)', () => {
      const result = validateAspectRatio(undefined);
      expect(result).toBeNull();
    });
  });

  describe('validateDuration', () => {
    it('should pass for valid durations', () => {
      VALID_DURATIONS.forEach((duration) => {
        const result = validateDuration(duration);
        expect(result).toBeNull();
      });
    });

    it('should fail for invalid duration', () => {
      const result = validateDuration(7);
      expect(result).not.toBeNull();
      expect(result?.message).toContain('Invalid duration');
    });

    it('should pass for undefined (optional)', () => {
      const result = validateDuration(undefined);
      expect(result).toBeNull();
    });

    it('should fail for non-number', () => {
      const result = validateDuration('5');
      expect(result).not.toBeNull();
    });
  });

  describe('validateSeed', () => {
    it('should pass for valid seed values', () => {
      const validSeeds = [0, 100, 1000, 4294967295];
      validSeeds.forEach((seed) => {
        const result = validateSeed(seed);
        expect(result).toBeNull();
      });
    });

    it('should fail for negative seed', () => {
      const result = validateSeed(-1);
      expect(result).not.toBeNull();
      expect(result?.message).toContain('at least 0');
    });

    it('should fail for seed above maximum', () => {
      const result = validateSeed(4294967296);
      expect(result).not.toBeNull();
      expect(result?.message).toContain('not exceed 4294967295');
    });

    it('should pass for undefined (optional)', () => {
      const result = validateSeed(undefined);
      expect(result).toBeNull();
    });
  });

  describe('validateSampleCount', () => {
    it('should pass for valid sample counts (default max 8)', () => {
      const validCounts = [1, 2, 4, 8];
      validCounts.forEach((count) => {
        const result = validateSampleCount(count);
        expect(result).toBeNull();
      });
    });

    it('should pass for valid sample counts with custom max', () => {
      const result = validateSampleCount(4, 4);
      expect(result).toBeNull();
    });

    it('should fail for zero', () => {
      const result = validateSampleCount(0);
      expect(result).not.toBeNull();
      expect(result?.message).toContain('at least 1');
    });

    it('should fail for count above maximum', () => {
      const result = validateSampleCount(9);
      expect(result).not.toBeNull();
      expect(result?.message).toContain('not exceed 8');
    });

    it('should fail for count above custom maximum', () => {
      const result = validateSampleCount(5, 4);
      expect(result).not.toBeNull();
      expect(result?.message).toContain('not exceed 4');
    });
  });

  describe('validateSafetyFilterLevel', () => {
    it('should pass for valid safety levels', () => {
      VALID_SAFETY_LEVELS.forEach((level) => {
        const result = validateSafetyFilterLevel(level);
        expect(result).toBeNull();
      });
    });

    it('should fail for invalid safety level', () => {
      const result = validateSafetyFilterLevel('invalid');
      expect(result).not.toBeNull();
      expect(result?.message).toContain('safetyFilterLevel');
    });

    it('should pass for undefined (optional)', () => {
      const result = validateSafetyFilterLevel(undefined);
      expect(result).toBeNull();
    });
  });

  describe('validatePersonGeneration', () => {
    it('should pass for valid person generation options', () => {
      VALID_PERSON_GENERATION.forEach((option) => {
        const result = validatePersonGeneration(option);
        expect(result).toBeNull();
      });
    });

    it('should fail for invalid person generation option', () => {
      const result = validatePersonGeneration('invalid');
      expect(result).not.toBeNull();
      expect(result?.message).toContain('personGeneration');
    });

    it('should pass for undefined (optional)', () => {
      const result = validatePersonGeneration(undefined);
      expect(result).toBeNull();
    });
  });

  describe('validateAll', () => {
    it('should return valid when all validations pass', () => {
      const result = validateAll([
        validateString('hello', 'name', { minLength: 1, maxLength: 10 }),
        validateUUID('550e8400-e29b-41d4-a716-446655440000', 'id'),
        validateInteger(5, 'count', { min: 1, max: 10 }),
      ]);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return all validation errors', () => {
      const result = validateAll([
        validateString('', 'name', { minLength: 1 }),
        validateUUID('invalid', 'id'),
        validateInteger(-1, 'count', { min: 0 }),
      ]);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors[0].field).toBe('name');
      expect(result.errors[1].field).toBe('id');
      expect(result.errors[2].field).toBe('count');
    });

    it('should filter out null results', () => {
      const result = validateAll([
        validateString('hello', 'name'),
        null,
        validateInteger(5, 'count'),
        null,
      ]);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle empty validation array', () => {
      const result = validateAll([]);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle mixed valid and invalid results', () => {
      const result = validateAll([
        validateString('hello', 'name'),
        validateUUID('invalid', 'id'),
        validateInteger(5, 'count'),
      ]);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('id');
    });
  });

  describe('UUID_REGEX', () => {
    it('should match valid UUIDs', () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      ];

      validUUIDs.forEach((uuid) => {
        expect(UUID_REGEX.test(uuid)).toBe(true);
      });
    });

    it('should not match invalid UUIDs', () => {
      const invalidUUIDs = [
        'invalid',
        '550e8400',
        '550e8400-e29b-51d4-a716-446655440000', // Wrong version
      ];

      invalidUUIDs.forEach((uuid) => {
        expect(UUID_REGEX.test(uuid)).toBe(false);
      });
    });
  });
});
