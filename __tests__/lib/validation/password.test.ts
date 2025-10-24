/**
 * Tests for Password Validation Utility
 */

import {
  validatePasswordStrength,
  getPasswordStrength,
  getPasswordStrengthLabel,
} from '@/lib/validation/password';

describe('Password Validation', () => {
  describe('validatePasswordStrength', () => {
    describe('Valid passwords', () => {
      it('should accept password with all requirements', () => {
        const result = validatePasswordStrength('Test1234!');
        expect(result.valid).toBe(true);
        expect(result.message).toBeUndefined();
        expect(result.errors).toBeUndefined();
      });

      it('should accept password with multiple special characters', () => {
        const result = validatePasswordStrength('Test1234!@#$');
        expect(result.valid).toBe(true);
      });

      it('should accept long password meeting all requirements', () => {
        const result = validatePasswordStrength('MyVerySecurePassword123!');
        expect(result.valid).toBe(true);
      });

      it('should accept password with mixed case and numbers', () => {
        const result = validatePasswordStrength('Aa1!bcde');
        expect(result.valid).toBe(true);
      });
    });

    describe('Invalid passwords - too short', () => {
      it('should reject password shorter than 8 characters', () => {
        const result = validatePasswordStrength('Test1!');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('At least 8 characters');
        expect(result.message).toContain('At least 8 characters');
      });

      it('should reject empty password', () => {
        const result = validatePasswordStrength('');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('At least 8 characters');
      });
    });

    describe('Invalid passwords - missing character types', () => {
      it('should reject password without uppercase letter', () => {
        const result = validatePasswordStrength('test1234!');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('One uppercase letter');
        expect(result.message).toContain('uppercase');
      });

      it('should reject password without lowercase letter', () => {
        const result = validatePasswordStrength('TEST1234!');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('One lowercase letter');
        expect(result.message).toContain('lowercase');
      });

      it('should reject password without number', () => {
        const result = validatePasswordStrength('TestTest!');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('One number');
        expect(result.message).toContain('number');
      });

      it('should reject password without special character', () => {
        const result = validatePasswordStrength('Test1234');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('One special character (!@#$%^&*...)');
        expect(result.message).toContain('special character');
      });
    });

    describe('Multiple validation errors', () => {
      it('should return all missing requirements', () => {
        const result = validatePasswordStrength('test');
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(4);
        expect(result.errors).toContain('At least 8 characters');
        expect(result.errors).toContain('One uppercase letter');
        expect(result.errors).toContain('One number');
        expect(result.errors).toContain('One special character (!@#$%^&*...)');
      });

      it('should list all errors in message', () => {
        const result = validatePasswordStrength('abc');
        expect(result.message).toContain('At least 8 characters');
        expect(result.message).toContain('uppercase');
        expect(result.message).toContain('number');
        expect(result.message).toContain('special');
      });

      it('should handle password with only numbers', () => {
        const result = validatePasswordStrength('12345678');
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(3);
      });

      it('should handle password with only letters', () => {
        const result = validatePasswordStrength('abcdefgh');
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(3);
      });
    });

    describe('Special characters', () => {
      it('should accept various special characters', () => {
        const specialChars = [
          '!',
          '@',
          '#',
          '$',
          '%',
          '^',
          '&',
          '*',
          '(',
          ')',
          '.',
          ',',
          '?',
          '"',
          ':',
          '{',
          '}',
          '|',
          '<',
          '>',
        ];
        specialChars.forEach((char) => {
          const result = validatePasswordStrength(`Test1234${char}`);
          expect(result.valid).toBe(true);
        });
      });

      it('should not accept underscore as special character', () => {
        const result = validatePasswordStrength('Test1234_');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('One special character (!@#$%^&*...)');
      });

      it('should not accept hyphen as special character', () => {
        const result = validatePasswordStrength('Test1234-');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('One special character (!@#$%^&*...)');
      });
    });
  });

  describe('getPasswordStrength', () => {
    it('should return 0 for empty password', () => {
      expect(getPasswordStrength('')).toBe(0);
    });

    it('should return low score for short password', () => {
      const score = getPasswordStrength('Test1!');
      expect(score).toBeLessThan(60);
    });

    it('should return higher score for 8+ character password', () => {
      const score = getPasswordStrength('Test1234!');
      expect(score).toBeGreaterThanOrEqual(80);
    });

    it('should give bonus for 12+ characters', () => {
      const score8 = getPasswordStrength('Test1234!');
      const score12 = getPasswordStrength('Test12345678!');
      expect(score12).toBeGreaterThan(score8);
    });

    it('should give bonus for 16+ characters', () => {
      const score12 = getPasswordStrength('Test12345678!');
      const score16 = getPasswordStrength('Test123456789012!');
      expect(score16).toBeGreaterThan(score12);
    });

    it('should award points for uppercase letters', () => {
      const withoutUpper = getPasswordStrength('test1234!');
      const withUpper = getPasswordStrength('Test1234!');
      expect(withUpper).toBeGreaterThan(withoutUpper);
    });

    it('should award points for lowercase letters', () => {
      const withoutLower = getPasswordStrength('TEST1234!');
      const withLower = getPasswordStrength('Test1234!');
      expect(withLower).toBeGreaterThan(withoutLower);
    });

    it('should award points for numbers', () => {
      const withoutNumber = getPasswordStrength('TestTest!');
      const withNumber = getPasswordStrength('Test1234!');
      expect(withNumber).toBeGreaterThan(withoutNumber);
    });

    it('should award points for special characters', () => {
      const withoutSpecial = getPasswordStrength('Test1234');
      const withSpecial = getPasswordStrength('Test1234!');
      expect(withSpecial).toBeGreaterThan(withoutSpecial);
    });

    it('should cap score at 100', () => {
      const score = getPasswordStrength('VeryLongPasswordWith123!@#$%^&*()');
      expect(score).toBe(100);
    });

    it('should return consistent score for same password', () => {
      const password = 'Test1234!';
      expect(getPasswordStrength(password)).toBe(getPasswordStrength(password));
    });

    it('should score password with all character types highly', () => {
      const score = getPasswordStrength('Abc123!@#$%^');
      expect(score).toBeGreaterThanOrEqual(80);
    });

    it('should score password missing character types lower', () => {
      const score = getPasswordStrength('abcdefgh');
      expect(score).toBeLessThan(40);
    });
  });

  describe('getPasswordStrengthLabel', () => {
    it('should return "Strong" for score >= 80', () => {
      const { label, color } = getPasswordStrengthLabel(80);
      expect(label).toBe('Strong');
      expect(color).toBe('text-green-600');
    });

    it('should return "Strong" for score = 100', () => {
      const { label } = getPasswordStrengthLabel(100);
      expect(label).toBe('Strong');
    });

    it('should return "Good" for score >= 60', () => {
      const { label, color } = getPasswordStrengthLabel(60);
      expect(label).toBe('Good');
      expect(color).toBe('text-blue-600');
    });

    it('should return "Good" for score = 79', () => {
      const { label } = getPasswordStrengthLabel(79);
      expect(label).toBe('Good');
    });

    it('should return "Fair" for score >= 40', () => {
      const { label, color } = getPasswordStrengthLabel(40);
      expect(label).toBe('Fair');
      expect(color).toBe('text-yellow-600');
    });

    it('should return "Fair" for score = 59', () => {
      const { label } = getPasswordStrengthLabel(59);
      expect(label).toBe('Fair');
    });

    it('should return "Weak" for score < 40', () => {
      const { label, color } = getPasswordStrengthLabel(39);
      expect(label).toBe('Weak');
      expect(color).toBe('text-red-600');
    });

    it('should return "Weak" for score = 0', () => {
      const { label } = getPasswordStrengthLabel(0);
      expect(label).toBe('Weak');
    });

    it('should handle boundary values correctly', () => {
      expect(getPasswordStrengthLabel(39).label).toBe('Weak');
      expect(getPasswordStrengthLabel(40).label).toBe('Fair');
      expect(getPasswordStrengthLabel(59).label).toBe('Fair');
      expect(getPasswordStrengthLabel(60).label).toBe('Good');
      expect(getPasswordStrengthLabel(79).label).toBe('Good');
      expect(getPasswordStrengthLabel(80).label).toBe('Strong');
    });

    it('should return appropriate color for each strength level', () => {
      expect(getPasswordStrengthLabel(0).color).toBe('text-red-600');
      expect(getPasswordStrengthLabel(50).color).toBe('text-yellow-600');
      expect(getPasswordStrengthLabel(70).color).toBe('text-blue-600');
      expect(getPasswordStrengthLabel(90).color).toBe('text-green-600');
    });
  });

  describe('Integration tests', () => {
    it('should validate and score password consistently', () => {
      const password = 'Test1234!';
      const validation = validatePasswordStrength(password);
      const score = getPasswordStrength(password);
      const { label } = getPasswordStrengthLabel(score);

      expect(validation.valid).toBe(true);
      expect(score).toBeGreaterThanOrEqual(80);
      expect(label).toBe('Strong');
    });

    it('should reject weak password and score it low', () => {
      const password = 'test';
      const validation = validatePasswordStrength(password);
      const score = getPasswordStrength(password);
      const { label } = getPasswordStrengthLabel(score);

      expect(validation.valid).toBe(false);
      expect(score).toBeLessThan(40);
      expect(label).toBe('Weak');
    });

    it('should validate moderately strong password', () => {
      const password = 'Test1234';
      const validation = validatePasswordStrength(password);
      const score = getPasswordStrength(password);

      expect(validation.valid).toBe(false);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(100);
    });
  });
});
