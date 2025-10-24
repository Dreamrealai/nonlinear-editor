import { describe, it, expect } from 'vitest';
import { validateEmail, normalizeEmail } from '@/lib/validation/email';

describe('validateEmail', () => {
  describe('valid emails', () => {
    it('should validate standard email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.user@example.com',
        'user+tag@example.co.uk',
        'user_name@example-domain.com',
        'first.last@sub.domain.example.com',
        'a@b.co',
        '123@example.com',
        'user123@example123.com',
      ];

      validEmails.forEach((email) => {
        const result = validateEmail(email);
        expect(result.valid).toBe(true);
        expect(result.message).toBeUndefined();
      });
    });

    it('should handle emails with special characters', () => {
      const validEmails = ["user!#$%&'*+/=?^_`{|}~@example.com", 'user.name+tag@example.com'];

      validEmails.forEach((email) => {
        const result = validateEmail(email);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('invalid emails', () => {
    it('should reject empty email', () => {
      const result = validateEmail('');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Email is required');
    });

    it('should reject whitespace-only email', () => {
      const result = validateEmail('   ');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Email is required');
    });

    it('should reject email without @ symbol', () => {
      const result = validateEmail('userexample.com');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Please enter a valid email address');
    });

    it('should reject email without domain', () => {
      const result = validateEmail('user@');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Please enter a valid email address');
    });

    it('should reject email without username', () => {
      const result = validateEmail('@example.com');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Please enter a valid email address');
    });

    it('should reject email with multiple @ symbols', () => {
      const result = validateEmail('user@@example.com');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Please enter a valid email address');
    });

    it('should reject email that is too long', () => {
      const longEmail = 'a'.repeat(255) + '@example.com';
      const result = validateEmail(longEmail);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Email is too long (max 254 characters)');
    });

    it('should reject email with invalid characters', () => {
      const invalidEmails = ['user name@example.com', 'user@exam ple.com', 'user[at]example.com'];

      invalidEmails.forEach((email) => {
        const result = validateEmail(email);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('common typos detection', () => {
    it('should detect gmial.com typo', () => {
      const result = validateEmail('user@gmial.com');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Did you mean user@gmail.com?');
    });

    it('should detect gmai.com typo', () => {
      const result = validateEmail('user@gmai.com');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Did you mean user@gmail.com?');
    });

    it('should detect yahooo.com typo', () => {
      const result = validateEmail('user@yahooo.com');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Did you mean user@yahoo.com?');
    });

    it('should detect yaho.com typo', () => {
      const result = validateEmail('user@yaho.com');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Did you mean user@yahoo.com?');
    });

    it('should detect hotmial.com typo', () => {
      const result = validateEmail('user@hotmial.com');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Did you mean user@hotmail.com?');
    });

    it('should be case-insensitive for typo detection', () => {
      const result = validateEmail('user@GMIAL.COM');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Did you mean user@gmail.com?');
    });
  });

  describe('whitespace handling', () => {
    it('should trim leading whitespace', () => {
      const result = validateEmail('   user@example.com');
      expect(result.valid).toBe(true);
    });

    it('should trim trailing whitespace', () => {
      const result = validateEmail('user@example.com   ');
      expect(result.valid).toBe(true);
    });

    it('should trim both leading and trailing whitespace', () => {
      const result = validateEmail('   user@example.com   ');
      expect(result.valid).toBe(true);
    });
  });
});

describe('normalizeEmail', () => {
  it('should convert to lowercase', () => {
    expect(normalizeEmail('USER@EXAMPLE.COM')).toBe('user@example.com');
    expect(normalizeEmail('User@Example.Com')).toBe('user@example.com');
  });

  it('should trim whitespace', () => {
    expect(normalizeEmail('  user@example.com  ')).toBe('user@example.com');
    expect(normalizeEmail('\tuser@example.com\n')).toBe('user@example.com');
  });

  it('should handle both trimming and lowercasing', () => {
    expect(normalizeEmail('  USER@EXAMPLE.COM  ')).toBe('user@example.com');
  });

  it('should preserve special characters', () => {
    expect(normalizeEmail('user+tag@example.com')).toBe('user+tag@example.com');
    expect(normalizeEmail('user.name@example.com')).toBe('user.name@example.com');
  });
});
