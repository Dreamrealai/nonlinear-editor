/**
 * Tests for validation utilities
 */

import {
  ValidationError,
  validateUUID,
  validateStringLength,
  validateEnum,
  validateIntegerRange,
  validateInteger,
  validateRequired,
  validateMimeType,
  validateFileSize,
  validateUrl,
  validateNumber,
  validateBoolean,
  validateAspectRatio,
  validateDuration,
  validateSeed,
  validateSampleCount,
  validateSafetyFilterLevel,
  validatePersonGeneration,
  validateString,
  validateAll,
  validateImageGenerationRequest,
  VALID_ASPECT_RATIOS,
  VALID_DURATIONS,
  VALID_SAFETY_LEVELS,
  VALID_PERSON_GENERATION,
} from '@/lib/validation';

describe('Validation Utilities', () => {
  describe('validateUUID', () => {
    it('should accept valid UUIDs', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      expect(() => validateUUID(validUUID)).not.toThrow();
    });

    it('should reject invalid UUID format', () => {
      expect(() => validateUUID('invalid-uuid')).toThrow(ValidationError);
      expect(() => validateUUID('invalid-uuid')).toThrow('Invalid ID format');
    });

    it('should reject non-string values', () => {
      expect(() => validateUUID(123)).toThrow(ValidationError);
      expect(() => validateUUID(null)).toThrow(ValidationError);
      expect(() => validateUUID(undefined)).toThrow(ValidationError);
    });

    it('should use custom field name in error message', () => {
      try {
        validateUUID('invalid', 'Project ID');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain('Project ID');
      }
    });
  });

  describe('validateStringLength', () => {
    it('should accept strings within length range', () => {
      expect(() => validateStringLength('hello', 'Field', 3, 10)).not.toThrow();
      expect(() => validateStringLength('abc', 'Field', 3, 10)).not.toThrow();
      expect(() => validateStringLength('1234567890', 'Field', 3, 10)).not.toThrow();
    });

    it('should reject strings that are too short', () => {
      expect(() => validateStringLength('ab', 'Field', 3, 10)).toThrow(ValidationError);
      expect(() => validateStringLength('ab', 'Field', 3, 10)).toThrow('at least 3 characters');
    });

    it('should reject strings that are too long', () => {
      expect(() => validateStringLength('12345678901', 'Field', 3, 10)).toThrow(ValidationError);
      expect(() => validateStringLength('12345678901', 'Field', 3, 10)).toThrow(
        'not exceed 10 characters'
      );
    });

    it('should reject non-string values', () => {
      expect(() => validateStringLength(123, 'Field', 3, 10)).toThrow(ValidationError);
      expect(() => validateStringLength(null, 'Field', 3, 10)).toThrow(ValidationError);
    });
  });

  describe('validateEnum', () => {
    const allowedValues = ['option1', 'option2', 'option3'] as const;

    it('should accept valid enum values', () => {
      expect(() => validateEnum('option1', 'Field', allowedValues)).not.toThrow();
      expect(() => validateEnum('option2', 'Field', allowedValues)).not.toThrow();
    });

    it('should reject invalid enum values', () => {
      expect(() => validateEnum('invalid', 'Field', allowedValues)).toThrow(ValidationError);
      expect(() => validateEnum('invalid', 'Field', allowedValues)).toThrow('Must be one of');
    });

    it('should reject non-string values', () => {
      expect(() => validateEnum(123, 'Field', allowedValues)).toThrow(ValidationError);
    });
  });

  describe('validateIntegerRange', () => {
    it('should accept integers within range', () => {
      expect(() => validateIntegerRange(5, 'Field', 1, 10)).not.toThrow();
      expect(() => validateIntegerRange(1, 'Field', 1, 10)).not.toThrow();
      expect(() => validateIntegerRange(10, 'Field', 1, 10)).not.toThrow();
    });

    it('should reject numbers outside range', () => {
      expect(() => validateIntegerRange(0, 'Field', 1, 10)).toThrow(ValidationError);
      expect(() => validateIntegerRange(11, 'Field', 1, 10)).toThrow(ValidationError);
      expect(() => validateIntegerRange(0, 'Field', 1, 10)).toThrow('between 1 and 10');
    });

    it('should reject non-integers', () => {
      expect(() => validateIntegerRange(5.5, 'Field', 1, 10)).toThrow(ValidationError);
      expect(() => validateIntegerRange(5.5, 'Field', 1, 10)).toThrow('must be an integer');
    });

    it('should reject non-numbers', () => {
      expect(() => validateIntegerRange('5', 'Field', 1, 10)).toThrow(ValidationError);
      expect(() => validateIntegerRange(null, 'Field', 1, 10)).toThrow(ValidationError);
    });
  });

  describe('validateRequired', () => {
    it('should accept non-empty values', () => {
      expect(() => validateRequired('value', 'Field')).not.toThrow();
      expect(() => validateRequired(123, 'Field')).not.toThrow();
      expect(() => validateRequired(true, 'Field')).not.toThrow();
      expect(() => validateRequired({}, 'Field')).not.toThrow();
    });

    it('should reject null', () => {
      expect(() => validateRequired(null, 'Field')).toThrow(ValidationError);
      expect(() => validateRequired(null, 'Field')).toThrow('is required');
    });

    it('should reject undefined', () => {
      expect(() => validateRequired(undefined, 'Field')).toThrow(ValidationError);
      expect(() => validateRequired(undefined, 'Field')).toThrow('is required');
    });

    it('should reject empty string', () => {
      expect(() => validateRequired('', 'Field')).toThrow(ValidationError);
      expect(() => validateRequired('', 'Field')).toThrow('is required');
    });
  });

  describe('validateMimeType', () => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];

    it('should accept valid MIME types', () => {
      expect(() => validateMimeType('image/jpeg', allowedTypes)).not.toThrow();
      expect(() => validateMimeType('image/png', allowedTypes)).not.toThrow();
    });

    it('should reject invalid MIME types', () => {
      expect(() => validateMimeType('video/mp4', allowedTypes)).toThrow(ValidationError);
      expect(() => validateMimeType('video/mp4', allowedTypes)).toThrow('must be one of');
    });
  });

  describe('validateFileSize', () => {
    const maxSize = 10 * 1024 * 1024; // 10MB

    it('should accept files within size limit', () => {
      expect(() => validateFileSize(5 * 1024 * 1024, maxSize)).not.toThrow();
      expect(() => validateFileSize(maxSize, maxSize)).not.toThrow();
    });

    it('should reject files exceeding size limit', () => {
      expect(() => validateFileSize(maxSize + 1, maxSize)).toThrow(ValidationError);
      expect(() => validateFileSize(maxSize + 1, maxSize)).toThrow('exceeds maximum');
    });
  });

  describe('validateImageGenerationRequest', () => {
    const validRequest = {
      prompt: 'A beautiful landscape',
      projectId: '550e8400-e29b-41d4-a716-446655440000',
    };

    it('should accept valid request', () => {
      expect(() => validateImageGenerationRequest(validRequest)).not.toThrow();
    });

    it('should accept valid request with optional fields', () => {
      const requestWithOptionals = {
        ...validRequest,
        aspectRatio: '16:9',
        negativePrompt: 'blurry',
        sampleCount: 2,
        seed: 12345,
        safetyFilterLevel: 'block_some',
        personGeneration: 'allow_adult',
      };
      expect(() => validateImageGenerationRequest(requestWithOptionals)).not.toThrow();
    });

    it('should reject missing prompt', () => {
      const request = { projectId: validRequest.projectId };
      expect(() => validateImageGenerationRequest(request)).toThrow(ValidationError);
      expect(() => validateImageGenerationRequest(request)).toThrow('Prompt is required');
    });

    it('should reject missing projectId', () => {
      const request = { prompt: validRequest.prompt };
      expect(() => validateImageGenerationRequest(request)).toThrow(ValidationError);
      expect(() => validateImageGenerationRequest(request)).toThrow('Project ID is required');
    });

    it('should reject invalid projectId format', () => {
      const request = { ...validRequest, projectId: 'invalid-uuid' };
      expect(() => validateImageGenerationRequest(request)).toThrow(ValidationError);
      expect(() => validateImageGenerationRequest(request)).toThrow('Invalid Project ID format');
    });

    it('should reject prompt that is too short', () => {
      const request = { ...validRequest, prompt: 'ab' };
      expect(() => validateImageGenerationRequest(request)).toThrow(ValidationError);
      expect(() => validateImageGenerationRequest(request)).toThrow('at least 3 characters');
    });

    it('should reject prompt that is too long', () => {
      const request = { ...validRequest, prompt: 'a'.repeat(1001) };
      expect(() => validateImageGenerationRequest(request)).toThrow(ValidationError);
      expect(() => validateImageGenerationRequest(request)).toThrow('not exceed 1000 characters');
    });

    it('should reject invalid aspectRatio', () => {
      const request = { ...validRequest, aspectRatio: '21:9' };
      expect(() => validateImageGenerationRequest(request)).toThrow(ValidationError);
      expect(() => validateImageGenerationRequest(request)).toThrow('Invalid Aspect ratio');
    });

    it('should reject invalid sampleCount', () => {
      const request = { ...validRequest, sampleCount: 10 };
      expect(() => validateImageGenerationRequest(request)).toThrow(ValidationError);
      expect(() => validateImageGenerationRequest(request)).toThrow('Sample count');
    });

    it('should reject invalid seed', () => {
      const request = { ...validRequest, seed: -1 };
      expect(() => validateImageGenerationRequest(request)).toThrow(ValidationError);
      expect(() => validateImageGenerationRequest(request)).toThrow('Seed');
    });

    it('should reject invalid safetyFilterLevel', () => {
      const request = { ...validRequest, safetyFilterLevel: 'invalid' };
      expect(() => validateImageGenerationRequest(request)).toThrow(ValidationError);
      expect(() => validateImageGenerationRequest(request)).toThrow('Safety filter level');
    });

    it('should reject invalid personGeneration', () => {
      const request = { ...validRequest, personGeneration: 'invalid' };
      expect(() => validateImageGenerationRequest(request)).toThrow(ValidationError);
      expect(() => validateImageGenerationRequest(request)).toThrow('Person generation');
    });
  });

  describe('validateInteger', () => {
    it('should accept valid integers', () => {
      expect(() => validateInteger(5, 'Count')).not.toThrow();
      expect(() => validateInteger(0, 'Count')).not.toThrow();
      expect(() => validateInteger(-5, 'Count')).not.toThrow();
    });

    it('should handle required option', () => {
      expect(() => validateInteger(null, 'Count', { required: true })).toThrow(ValidationError);
      expect(() => validateInteger(undefined, 'Count', { required: true })).toThrow(
        ValidationError
      );
      expect(() => validateInteger(null, 'Count', { required: false })).not.toThrow();
      expect(() => validateInteger(undefined, 'Count', { required: false })).not.toThrow();
    });

    it('should validate min/max range', () => {
      expect(() => validateInteger(5, 'Count', { min: 1, max: 10 })).not.toThrow();
      expect(() => validateInteger(0, 'Count', { min: 1, max: 10 })).toThrow(ValidationError);
      expect(() => validateInteger(11, 'Count', { min: 1, max: 10 })).toThrow(ValidationError);
    });

    it('should reject non-integers', () => {
      expect(() => validateInteger(5.5, 'Count')).toThrow(ValidationError);
    });
  });

  describe('validateUrl', () => {
    it('should accept valid HTTP/HTTPS URLs', () => {
      expect(() => validateUrl('http://example.com')).not.toThrow();
      expect(() => validateUrl('https://example.com')).not.toThrow();
      expect(() => validateUrl('https://www.example.com/path?query=value')).not.toThrow();
    });

    it('should reject non-string values', () => {
      expect(() => validateUrl(123)).toThrow(ValidationError);
      expect(() => validateUrl(null)).toThrow(ValidationError);
    });

    it('should reject invalid URL formats', () => {
      expect(() => validateUrl('not a url')).toThrow(ValidationError);
      expect(() => validateUrl('ftp://example.com')).toThrow(ValidationError);
    });

    it('should enforce HTTPS when httpsOnly is true', () => {
      expect(() => validateUrl('https://example.com', 'URL', { httpsOnly: true })).not.toThrow();
      expect(() => validateUrl('http://example.com', 'URL', { httpsOnly: true })).toThrow(
        ValidationError
      );
    });

    it('should enforce maxLength', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(100);
      expect(() => validateUrl(longUrl, 'URL', { maxLength: 50 })).toThrow(ValidationError);
    });
  });

  describe('validateNumber', () => {
    it('should accept valid numbers', () => {
      expect(() => validateNumber(5, 'Value')).not.toThrow();
      expect(() => validateNumber(5.5, 'Value')).not.toThrow();
      expect(() => validateNumber(0, 'Value')).not.toThrow();
      expect(() => validateNumber(-5, 'Value')).not.toThrow();
    });

    it('should reject non-numbers', () => {
      expect(() => validateNumber('5', 'Value')).toThrow(ValidationError);
      expect(() => validateNumber(null, 'Value')).toThrow(ValidationError);
    });

    it('should reject NaN', () => {
      expect(() => validateNumber(NaN, 'Value')).toThrow(ValidationError);
    });

    it('should validate min/max', () => {
      expect(() => validateNumber(5, 'Value', 1, 10)).not.toThrow();
      expect(() => validateNumber(0, 'Value', 1, 10)).toThrow(ValidationError);
      expect(() => validateNumber(11, 'Value', 1, 10)).toThrow(ValidationError);
    });
  });

  describe('validateBoolean', () => {
    it('should accept boolean values', () => {
      expect(() => validateBoolean(true, 'Flag')).not.toThrow();
      expect(() => validateBoolean(false, 'Flag')).not.toThrow();
    });

    it('should reject non-boolean values when required', () => {
      expect(() => validateBoolean(1, 'Flag')).toThrow(ValidationError);
      expect(() => validateBoolean('true', 'Flag')).toThrow(ValidationError);
      expect(() => validateBoolean(null, 'Flag', { required: true })).toThrow(ValidationError);
    });

    it('should handle required option', () => {
      expect(() => validateBoolean(undefined, 'Flag', { required: false })).not.toThrow();
      expect(() => validateBoolean(null, 'Flag', { required: false })).not.toThrow();
      expect(() => validateBoolean(undefined, 'Flag', { required: true })).toThrow(ValidationError);
    });
  });

  describe('validateAspectRatio', () => {
    it('should accept valid aspect ratios', () => {
      VALID_ASPECT_RATIOS.forEach((ratio) => {
        expect(() => validateAspectRatio(ratio)).not.toThrow();
      });
    });

    it('should accept undefined/null', () => {
      expect(() => validateAspectRatio(undefined)).not.toThrow();
      expect(() => validateAspectRatio(null)).not.toThrow();
    });

    it('should reject invalid aspect ratios', () => {
      expect(() => validateAspectRatio('21:9')).toThrow(ValidationError);
      expect(() => validateAspectRatio('invalid')).toThrow(ValidationError);
    });
  });

  describe('validateDuration', () => {
    it('should accept valid durations', () => {
      VALID_DURATIONS.forEach((duration) => {
        expect(() => validateDuration(duration)).not.toThrow();
      });
    });

    it('should accept undefined/null', () => {
      expect(() => validateDuration(undefined)).not.toThrow();
      expect(() => validateDuration(null)).not.toThrow();
    });

    it('should reject invalid durations', () => {
      expect(() => validateDuration(3)).toThrow(ValidationError);
      expect(() => validateDuration(7)).toThrow(ValidationError);
      expect(() => validateDuration('5')).toThrow(ValidationError);
    });
  });

  describe('validateSeed', () => {
    it('should accept valid seeds', () => {
      expect(() => validateSeed(0)).not.toThrow();
      expect(() => validateSeed(12345)).not.toThrow();
      expect(() => validateSeed(4294967295)).not.toThrow();
    });

    it('should accept undefined/null', () => {
      expect(() => validateSeed(undefined)).not.toThrow();
      expect(() => validateSeed(null)).not.toThrow();
    });

    it('should reject out of range seeds', () => {
      expect(() => validateSeed(-1)).toThrow(ValidationError);
      expect(() => validateSeed(4294967296)).toThrow(ValidationError);
    });
  });

  describe('validateSampleCount', () => {
    it('should accept valid sample counts', () => {
      expect(() => validateSampleCount(1)).not.toThrow();
      expect(() => validateSampleCount(4)).not.toThrow();
      expect(() => validateSampleCount(8)).not.toThrow();
    });

    it('should accept undefined/null', () => {
      expect(() => validateSampleCount(undefined)).not.toThrow();
      expect(() => validateSampleCount(null)).not.toThrow();
    });

    it('should respect custom max', () => {
      expect(() => validateSampleCount(4, 4)).not.toThrow();
      expect(() => validateSampleCount(5, 4)).toThrow(ValidationError);
    });

    it('should reject out of range counts', () => {
      expect(() => validateSampleCount(0)).toThrow(ValidationError);
      expect(() => validateSampleCount(9)).toThrow(ValidationError);
    });
  });

  describe('validateSafetyFilterLevel', () => {
    it('should accept valid safety levels', () => {
      VALID_SAFETY_LEVELS.forEach((level) => {
        expect(() => validateSafetyFilterLevel(level)).not.toThrow();
      });
    });

    it('should accept undefined/null', () => {
      expect(() => validateSafetyFilterLevel(undefined)).not.toThrow();
      expect(() => validateSafetyFilterLevel(null)).not.toThrow();
    });

    it('should reject invalid safety levels', () => {
      expect(() => validateSafetyFilterLevel('block_all')).toThrow(ValidationError);
    });
  });

  describe('validatePersonGeneration', () => {
    it('should accept valid person generation options', () => {
      VALID_PERSON_GENERATION.forEach((option) => {
        expect(() => validatePersonGeneration(option)).not.toThrow();
      });
    });

    it('should accept undefined/null', () => {
      expect(() => validatePersonGeneration(undefined)).not.toThrow();
      expect(() => validatePersonGeneration(null)).not.toThrow();
    });

    it('should reject invalid options', () => {
      expect(() => validatePersonGeneration('allow_kids')).toThrow(ValidationError);
    });
  });

  describe('validateString', () => {
    it('should accept valid strings', () => {
      expect(() => validateString('hello', 'Name')).not.toThrow();
      expect(() => validateString('hello', 'Name', { minLength: 3, maxLength: 10 })).not.toThrow();
    });

    it('should handle required option', () => {
      expect(() => validateString('', 'Name', { required: false })).not.toThrow();
      expect(() => validateString(undefined, 'Name', { required: false })).not.toThrow();
      expect(() => validateString('', 'Name', { required: true })).toThrow(ValidationError);
      expect(() => validateString(undefined, 'Name', { required: true })).toThrow(ValidationError);
    });

    it('should validate length constraints', () => {
      expect(() => validateString('hi', 'Name', { minLength: 3 })).toThrow(ValidationError);
      expect(() => validateString('hello world', 'Name', { maxLength: 5 })).toThrow(
        ValidationError
      );
    });
  });

  describe('validateAll', () => {
    it('should run validation function', () => {
      expect(() => {
        validateAll(() => {
          validateString('hello', 'Name');
          validateNumber(5, 'Count');
        });
      }).not.toThrow();
    });

    it('should throw on first error', () => {
      expect(() => {
        validateAll(() => {
          validateString('hello', 'Name');
          validateNumber('invalid', 'Count');
          validateBoolean(true, 'Flag');
        });
      }).toThrow(ValidationError);
    });
  });
});
