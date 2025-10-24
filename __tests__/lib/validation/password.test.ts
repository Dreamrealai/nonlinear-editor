import { describe, it, expect } from 'vitest';
import {
  validatePasswordStrength,
  getPasswordStrength,
  getPasswordStrengthLabel,
} from '@/lib/validation/password';

describe('validatePasswordStrength', () => {
  describe('valid passwords', () => {
    it('should validate password meeting all requirements', () => {
      const validPasswords = [
        'Password123!',
        'MyP@ssw0rd',
        'Str0ng!Pass',
        'C0mpl3x&Secure',
        'Test1234!@#$',
      ];

      validPasswords.forEach((password) => {
        const result = validatePasswordStrength(password);
        expect(result.valid).toBe(true);
        expect(result.message).toBeUndefined();
        expect(result.errors).toBeUndefined();
      });
    });

    it('should validate long secure passwords', () => {
      const result = validatePasswordStrength('ThisIsAVeryLongAndSecureP@ssw0rd123!');
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid passwords - too short', () => {
    it('should reject password shorter than 8 characters', () => {
      const result = validatePasswordStrength('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least 8 characters');
    });

    it('should reject very short passwords', () => {
      const result = validatePasswordStrength('A1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least 8 characters');
    });
  });

  describe('invalid passwords - missing uppercase', () => {
    it('should reject password without uppercase letter', () => {
      const result = validatePasswordStrength('password123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('One uppercase letter');
    });
  });

  describe('invalid passwords - missing lowercase', () => {
    it('should reject password without lowercase letter', () => {
      const result = validatePasswordStrength('PASSWORD123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('One lowercase letter');
    });
  });

  describe('invalid passwords - missing number', () => {
    it('should reject password without number', () => {
      const result = validatePasswordStrength('Password!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('One number');
    });
  });

  describe('invalid passwords - missing special character', () => {
    it('should reject password without special character', () => {
      const result = validatePasswordStrength('Password123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('One special character (!@#$%^&*...)');
    });
  });

  describe('invalid passwords - multiple requirements missing', () => {
    it('should list all missing requirements', () => {
      const result = validatePasswordStrength('password');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain('One uppercase letter');
      expect(result.errors).toContain('One number');
      expect(result.errors).toContain('One special character (!@#$%^&*...)');
    });

    it('should provide comprehensive message for weak password', () => {
      const result = validatePasswordStrength('abc');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(5);
      expect(result.message).toContain('At least 8 characters');
      expect(result.message).toContain('One uppercase letter');
      expect(result.message).toContain('One lowercase letter');
      expect(result.message).toContain('One number');
      expect(result.message).toContain('One special character');
    });
  });

  describe('special character recognition', () => {
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
        const password = `Password123${char}`;
        const result = validatePasswordStrength(password);
        expect(result.valid).toBe(true);
      });
    });
  });
});

describe('getPasswordStrength', () => {
  it('should return 0 for empty password', () => {
    expect(getPasswordStrength('')).toBe(0);
  });

  it('should give partial score for weak passwords', () => {
    const score = getPasswordStrength('password');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(60);
  });

  it('should give higher score for passwords with more requirements met', () => {
    const weak = getPasswordStrength('password');
    const medium = getPasswordStrength('Password1');
    const strong = getPasswordStrength('Password123!');

    expect(medium).toBeGreaterThan(weak);
    expect(strong).toBeGreaterThan(medium);
  });

  it('should reward length', () => {
    const short = getPasswordStrength('Pass1!');
    const medium = getPasswordStrength('Password123!');
    const long = getPasswordStrength('VeryLongPassword123!');
    const veryLong = getPasswordStrength('VeryVeryLongPassword123!');

    expect(medium).toBeGreaterThan(short);
    expect(long).toBeGreaterThan(medium);
    expect(veryLong).toBeGreaterThan(long);
  });

  it('should give 20 points for 8+ characters', () => {
    const shortScore = getPasswordStrength('1234567'); // 7 chars
    const longScore = getPasswordStrength('12345678'); // 8 chars
    expect(longScore - shortScore).toBeGreaterThanOrEqual(20);
  });

  it('should give additional 10 points for 12+ characters', () => {
    const score11 = getPasswordStrength('12345678901'); // 11 chars
    const score12 = getPasswordStrength('123456789012'); // 12 chars
    expect(score12).toBeGreaterThan(score11);
  });

  it('should give additional 10 points for 16+ characters', () => {
    const score15 = getPasswordStrength('123456789012345'); // 15 chars
    const score16 = getPasswordStrength('1234567890123456'); // 16 chars
    expect(score16).toBeGreaterThan(score15);
  });

  it('should give 15 points for uppercase letters', () => {
    const noUpper = getPasswordStrength('password');
    const withUpper = getPasswordStrength('Password');
    expect(withUpper - noUpper).toBe(15);
  });

  it('should give 15 points for lowercase letters', () => {
    const noLower = getPasswordStrength('PASSWORD');
    const withLower = getPasswordStrength('PASSWORd');
    expect(withLower - noLower).toBe(15);
  });

  it('should give 15 points for numbers', () => {
    const noNumber = getPasswordStrength('Password');
    const withNumber = getPasswordStrength('Password1');
    expect(withNumber - noNumber).toBe(15);
  });

  it('should give 15 points for special characters', () => {
    const noSpecial = getPasswordStrength('Password1');
    const withSpecial = getPasswordStrength('Password1!');
    expect(withSpecial - noSpecial).toBe(15);
  });

  it('should cap score at 100', () => {
    const veryStrongPassword = 'VeryVeryLongAndComplexP@ssw0rd123!@#';
    const score = getPasswordStrength(veryStrongPassword);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should give max score (100) for strong passwords', () => {
    const strongPassword = 'ThisIsAVeryStrongP@ssw0rd123!';
    const score = getPasswordStrength(strongPassword);
    expect(score).toBe(100);
  });
});

describe('getPasswordStrengthLabel', () => {
  it('should return "Strong" for scores >= 80', () => {
    const result = getPasswordStrengthLabel(80);
    expect(result.label).toBe('Strong');
    expect(result.color).toBe('text-green-600');

    const result100 = getPasswordStrengthLabel(100);
    expect(result100.label).toBe('Strong');
  });

  it('should return "Good" for scores 60-79', () => {
    const result = getPasswordStrengthLabel(60);
    expect(result.label).toBe('Good');
    expect(result.color).toBe('text-blue-600');

    const result79 = getPasswordStrengthLabel(79);
    expect(result79.label).toBe('Good');
  });

  it('should return "Fair" for scores 40-59', () => {
    const result = getPasswordStrengthLabel(40);
    expect(result.label).toBe('Fair');
    expect(result.color).toBe('text-yellow-600');

    const result59 = getPasswordStrengthLabel(59);
    expect(result59.label).toBe('Fair');
  });

  it('should return "Weak" for scores < 40', () => {
    const result = getPasswordStrengthLabel(39);
    expect(result.label).toBe('Weak');
    expect(result.color).toBe('text-red-600');

    const result0 = getPasswordStrengthLabel(0);
    expect(result0.label).toBe('Weak');
  });

  it('should use appropriate colors for each strength level', () => {
    expect(getPasswordStrengthLabel(100).color).toBe('text-green-600'); // Strong
    expect(getPasswordStrengthLabel(70).color).toBe('text-blue-600'); // Good
    expect(getPasswordStrengthLabel(50).color).toBe('text-yellow-600'); // Fair
    expect(getPasswordStrengthLabel(20).color).toBe('text-red-600'); // Weak
  });
});

describe('integration - password validation and strength', () => {
  it('should validate and score a weak password', () => {
    const password = 'password';
    const validation = validatePasswordStrength(password);
    const strength = getPasswordStrength(password);
    const label = getPasswordStrengthLabel(strength);

    expect(validation.valid).toBe(false);
    expect(strength).toBeLessThan(60);
    expect(label.label).toBe('Weak');
  });

  it('should validate and score a medium password', () => {
    const password = 'Password123';
    const validation = validatePasswordStrength(password);
    const strength = getPasswordStrength(password);
    const label = getPasswordStrengthLabel(strength);

    expect(validation.valid).toBe(false); // Missing special char
    expect(strength).toBeGreaterThan(40);
    expect(strength).toBeLessThan(80);
  });

  it('should validate and score a strong password', () => {
    const password = 'MySecureP@ssw0rd123!';
    const validation = validatePasswordStrength(password);
    const strength = getPasswordStrength(password);
    const label = getPasswordStrengthLabel(strength);

    expect(validation.valid).toBe(true);
    expect(strength).toBeGreaterThanOrEqual(80);
    expect(label.label).toBe('Strong');
  });
});
