/**
 * Tests for Email Validation Utility
 */

import { validateEmail, normalizeEmail } from '@/lib/validation/email';

describe('Email Validation', () => {
  describe('validateEmail', () => {
    describe('Valid emails', () => {
      it('should accept standard email format', () => {
        const result = validateEmail('user@example.com');
        expect(result.valid).toBe(true);
        expect(result.message).toBeUndefined();
      });

      it('should accept email with numbers', () => {
        expect(validateEmail('user123@example.com').valid).toBe(true);
      });

      it('should accept email with dots in local part', () => {
        expect(validateEmail('user.name@example.com').valid).toBe(true);
      });

      it('should accept email with subdomain', () => {
        expect(validateEmail('user@mail.example.com').valid).toBe(true);
      });

      it('should accept email with special characters', () => {
        expect(validateEmail('user+tag@example.com').valid).toBe(true);
        expect(validateEmail('user_name@example.com').valid).toBe(true);
        expect(validateEmail('user-name@example.com').valid).toBe(true);
      });

      it('should accept email with multiple subdomains', () => {
        expect(validateEmail('user@mail.corporate.example.com').valid).toBe(true);
      });

      it('should trim whitespace from valid emails', () => {
        expect(validateEmail('  user@example.com  ').valid).toBe(true);
      });
    });

    describe('Invalid emails', () => {
      it('should reject empty string', () => {
        const result = validateEmail('');
        expect(result.valid).toBe(false);
        expect(result.message).toBe('Email is required');
      });

      it('should reject whitespace-only string', () => {
        const result = validateEmail('   ');
        expect(result.valid).toBe(false);
        expect(result.message).toBe('Email is required');
      });

      it('should reject email without @', () => {
        const result = validateEmail('userexample.com');
        expect(result.valid).toBe(false);
        expect(result.message).toBe('Please enter a valid email address');
      });

      it('should reject email without domain', () => {
        const result = validateEmail('user@');
        expect(result.valid).toBe(false);
        expect(result.message).toBe('Please enter a valid email address');
      });

      it('should reject email without local part', () => {
        const result = validateEmail('@example.com');
        expect(result.valid).toBe(false);
        expect(result.message).toBe('Please enter a valid email address');
      });

      it('should reject email with spaces', () => {
        expect(validateEmail('user @example.com').valid).toBe(false);
        expect(validateEmail('user@ example.com').valid).toBe(false);
      });

      it('should reject email longer than 254 characters', () => {
        const longEmail = 'a'.repeat(250) + '@example.com';
        const result = validateEmail(longEmail);
        expect(result.valid).toBe(false);
        expect(result.message).toBe('Email is too long (max 254 characters)');
      });

      it('should reject email with invalid characters', () => {
        expect(validateEmail('user name@example.com').valid).toBe(false);
      });

      it('should reject email with multiple @ signs', () => {
        expect(validateEmail('user@@example.com').valid).toBe(false);
      });
    });

    describe('Common typo detection', () => {
      it('should suggest gmail.com for gmial.com', () => {
        const result = validateEmail('user@gmial.com');
        expect(result.valid).toBe(false);
        expect(result.message).toContain('gmail.com');
        expect(result.message).toContain('Did you mean');
      });

      it('should suggest gmail.com for gmai.com', () => {
        const result = validateEmail('user@gmai.com');
        expect(result.valid).toBe(false);
        expect(result.message).toContain('gmail.com');
      });

      it('should suggest yahoo.com for yahooo.com', () => {
        const result = validateEmail('user@yahooo.com');
        expect(result.valid).toBe(false);
        expect(result.message).toContain('yahoo.com');
      });

      it('should suggest yahoo.com for yaho.com', () => {
        const result = validateEmail('user@yaho.com');
        expect(result.valid).toBe(false);
        expect(result.message).toContain('yahoo.com');
      });

      it('should suggest hotmail.com for hotmial.com', () => {
        const result = validateEmail('user@hotmial.com');
        expect(result.valid).toBe(false);
        expect(result.message).toContain('hotmail.com');
      });

      it('should preserve local part in typo suggestion', () => {
        const result = validateEmail('john.doe@gmial.com');
        expect(result.message).toContain('john.doe@gmail.com');
      });

      it('should handle typo domains case-insensitively', () => {
        const result = validateEmail('user@GMIAL.COM');
        expect(result.valid).toBe(false);
        expect(result.message).toContain('gmail.com');
      });
    });

    describe('Edge cases', () => {
      it('should handle email with maximum valid length', () => {
        const localPart = 'a'.repeat(64);
        const domain = 'b'.repeat(63) + '.com';
        const email = `${localPart}@${domain}`;

        if (email.length <= 254) {
          expect(validateEmail(email).valid).toBe(true);
        }
      });

      it('should accept single character local part', () => {
        expect(validateEmail('a@example.com').valid).toBe(true);
      });

      it('should accept single character domain segments', () => {
        expect(validateEmail('user@a.b').valid).toBe(true);
      });

      it('should accept all allowed special characters in local part', () => {
        const specialChars = "!#$%&'*+/=?^_`{|}~";
        expect(validateEmail(`user${specialChars}@example.com`).valid).toBe(true);
      });
    });
  });

  describe('normalizeEmail', () => {
    it('should convert to lowercase', () => {
      expect(normalizeEmail('User@Example.COM')).toBe('user@example.com');
    });

    it('should trim whitespace', () => {
      expect(normalizeEmail('  user@example.com  ')).toBe('user@example.com');
    });

    it('should handle both trim and lowercase', () => {
      expect(normalizeEmail('  USER@EXAMPLE.COM  ')).toBe('user@example.com');
    });

    it('should handle already normalized email', () => {
      expect(normalizeEmail('user@example.com')).toBe('user@example.com');
    });

    it('should preserve special characters', () => {
      expect(normalizeEmail('user+tag@example.com')).toBe('user+tag@example.com');
    });

    it('should handle empty string', () => {
      expect(normalizeEmail('')).toBe('');
    });
  });
});
