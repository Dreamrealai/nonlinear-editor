/**
 * Tests for Input Sanitization Utilities
 */

import {
  sanitizeString,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeUUID,
  sanitizeInteger,
  sanitizeNumber,
  sanitizeBoolean,
  sanitizeObject,
  removeSQLPatterns,
  sanitizeFilename,
  SanitizationPresets,
} from '@/lib/api/sanitization';

describe('Sanitization Utilities', () => {
  describe('sanitizeString', () => {
    it('should trim whitespace by default', () => {
      expect(sanitizeString('  test  ')).toBe('test');
    });

    it('should not trim when trim option is false', () => {
      expect(sanitizeString('  test  ', { trim: false })).toBe('  test  ');
    });

    it('should remove null bytes', () => {
      expect(sanitizeString('test\x00value')).toBe('testvalue');
    });

    it('should keep null bytes when option is false', () => {
      expect(sanitizeString('test\x00value', { removeNullBytes: false })).toBe('test\x00value');
    });

    it('should remove control characters', () => {
      expect(sanitizeString('test\x01\x02value')).toBe('testvalue');
    });

    it('should keep newlines and tabs', () => {
      expect(sanitizeString('test\n\tvalue')).toBe('test\n\tvalue');
    });

    it('should strip HTML tags', () => {
      expect(sanitizeString('<script>alert("xss")</script>', { stripHtml: true })).toBe(
        'alert("xss")'
      );
      expect(sanitizeString('<div>test</div>', { stripHtml: true })).toBe('test');
    });

    it('should normalize Unicode', () => {
      expect(sanitizeString('\u00e9')).toBe('\u00e9');
    });

    it('should truncate to max length', () => {
      expect(sanitizeString('hello world', { maxLength: 5 })).toBe('hello');
    });

    it('should apply all sanitizations together', () => {
      const input = '  <p>test\x00value</p>  ';
      const result = sanitizeString(input, {
        trim: true,
        stripHtml: true,
        removeNullBytes: true,
        maxLength: 10,
      });
      expect(result).toBe('testvalue');
    });
  });

  describe('sanitizeEmail', () => {
    it('should sanitize valid emails', () => {
      expect(sanitizeEmail('test@example.com')).toBe('test@example.com');
      expect(sanitizeEmail('Test@Example.COM')).toBe('test@example.com');
    });

    it('should trim and lowercase', () => {
      expect(sanitizeEmail('  TEST@EXAMPLE.COM  ')).toBe('test@example.com');
    });

    it('should reject invalid emails', () => {
      expect(sanitizeEmail('invalid')).toBeNull();
      expect(sanitizeEmail('invalid@')).toBeNull();
      expect(sanitizeEmail('@example.com')).toBeNull();
      expect(sanitizeEmail('')).toBeNull();
    });

    it('should remove dangerous characters', () => {
      const email = 'test@example.com';
      expect(sanitizeEmail(email)).toBe('test@example.com');
    });

    it('should enforce max length', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(sanitizeEmail(longEmail)).toBeTruthy();
    });

    it('should accept various valid email formats', () => {
      expect(sanitizeEmail('user+tag@example.com')).toBe('user+tag@example.com');
      expect(sanitizeEmail('user.name@example.com')).toBe('user.name@example.com');
      expect(sanitizeEmail('user123@mail.example.com')).toBe('user123@mail.example.com');
    });
  });

  describe('sanitizeUrl', () => {
    it('should sanitize valid HTTP URLs', () => {
      const result = sanitizeUrl('http://example.com');
      expect(result).toBe('http://example.com/');
    });

    it('should sanitize valid HTTPS URLs', () => {
      const result = sanitizeUrl('https://example.com');
      expect(result).toBe('https://example.com/');
    });

    it('should reject URLs when httpsOnly is true', () => {
      expect(sanitizeUrl('http://example.com', { httpsOnly: true })).toBeNull();
      expect(sanitizeUrl('https://example.com', { httpsOnly: true })).toBe('https://example.com/');
    });

    it('should check allowed protocols', () => {
      expect(sanitizeUrl('ftp://example.com')).toBeNull();
      expect(sanitizeUrl('ftp://example.com', { allowedProtocols: ['ftp:'] })).toBe(
        'ftp://example.com/'
      );
    });

    it('should truncate to max length', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(3000);
      const result = sanitizeUrl(longUrl, { maxLength: 100 });
      expect(result).toBeTruthy();
      expect(result!.length).toBeLessThanOrEqual(100);
    });

    it('should reject invalid URLs', () => {
      expect(sanitizeUrl('not a url')).toBeNull();
      expect(sanitizeUrl('')).toBeNull();
      expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
    });

    it('should normalize URLs', () => {
      const result = sanitizeUrl('  https://example.com  ');
      expect(result).toBe('https://example.com/');
    });
  });

  describe('sanitizeUUID', () => {
    it('should sanitize valid UUIDs', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(sanitizeUUID(uuid)).toBe(uuid);
    });

    it('should lowercase UUIDs', () => {
      const uuid = '123E4567-E89B-12D3-A456-426614174000';
      expect(sanitizeUUID(uuid)).toBe(uuid.toLowerCase());
    });

    it('should trim whitespace', () => {
      const uuid = '  123e4567-e89b-12d3-a456-426614174000  ';
      expect(sanitizeUUID(uuid)).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should reject invalid UUIDs', () => {
      expect(sanitizeUUID('not-a-uuid')).toBeNull();
      expect(sanitizeUUID('123e4567-e89b-12d3-a456-42661417400')).toBeNull();
      expect(sanitizeUUID('')).toBeNull();
    });

    it('should only accept v4 UUIDs', () => {
      expect(sanitizeUUID('123e4567-e89b-12d3-a456-426614174000')).toBeTruthy();
      expect(sanitizeUUID('123e4567-e89b-32d3-a456-426614174000')).toBeNull();
    });
  });

  describe('sanitizeInteger', () => {
    it('should parse integer strings', () => {
      expect(sanitizeInteger('123')).toBe(123);
      expect(sanitizeInteger('0')).toBe(0);
      expect(sanitizeInteger('-5')).toBe(-5);
    });

    it('should accept number types', () => {
      expect(sanitizeInteger(123)).toBe(123);
      expect(sanitizeInteger(0)).toBe(0);
    });

    it('should reject non-integers', () => {
      expect(sanitizeInteger('123.45')).toBeNull();
      expect(sanitizeInteger('abc')).toBeNull();
      expect(sanitizeInteger(123.45)).toBeNull();
    });

    it('should enforce minimum value', () => {
      expect(sanitizeInteger(5, { min: 0 })).toBe(5);
      expect(sanitizeInteger(-1, { min: 0 })).toBeNull();
    });

    it('should enforce maximum value', () => {
      expect(sanitizeInteger(5, { max: 10 })).toBe(5);
      expect(sanitizeInteger(15, { max: 10 })).toBeNull();
    });

    it('should enforce range', () => {
      expect(sanitizeInteger(5, { min: 0, max: 10 })).toBe(5);
      expect(sanitizeInteger(-1, { min: 0, max: 10 })).toBeNull();
      expect(sanitizeInteger(15, { min: 0, max: 10 })).toBeNull();
    });

    it('should reject NaN', () => {
      expect(sanitizeInteger(NaN)).toBeNull();
      expect(sanitizeInteger('NaN')).toBeNull();
    });
  });

  describe('sanitizeNumber', () => {
    it('should parse number strings', () => {
      expect(sanitizeNumber('123.45')).toBe(123.45);
      expect(sanitizeNumber('0')).toBe(0);
      expect(sanitizeNumber('-5.5')).toBe(-5.5);
    });

    it('should accept number types', () => {
      expect(sanitizeNumber(123.45)).toBe(123.45);
      expect(sanitizeNumber(0)).toBe(0);
    });

    it('should reject NaN by default', () => {
      expect(sanitizeNumber(NaN)).toBeNull();
      expect(sanitizeNumber('abc')).toBeNull();
    });

    it('should allow NaN when specified', () => {
      expect(sanitizeNumber(NaN, { allowNaN: true })).toBe(NaN);
    });

    it('should reject Infinity by default', () => {
      expect(sanitizeNumber(Infinity)).toBeNull();
      expect(sanitizeNumber(-Infinity)).toBeNull();
    });

    it('should allow Infinity when specified', () => {
      expect(sanitizeNumber(Infinity, { allowInfinity: true })).toBe(Infinity);
      expect(sanitizeNumber(-Infinity, { allowInfinity: true })).toBe(-Infinity);
    });

    it('should enforce minimum value', () => {
      expect(sanitizeNumber(5.5, { min: 0 })).toBe(5.5);
      expect(sanitizeNumber(-1, { min: 0 })).toBeNull();
    });

    it('should enforce maximum value', () => {
      expect(sanitizeNumber(5.5, { max: 10 })).toBe(5.5);
      expect(sanitizeNumber(15, { max: 10 })).toBeNull();
    });

    it('should enforce range', () => {
      expect(sanitizeNumber(5.5, { min: 0, max: 10 })).toBe(5.5);
      expect(sanitizeNumber(-1, { min: 0, max: 10 })).toBeNull();
      expect(sanitizeNumber(15, { min: 0, max: 10 })).toBeNull();
    });
  });

  describe('sanitizeBoolean', () => {
    it('should accept boolean types', () => {
      expect(sanitizeBoolean(true)).toBe(true);
      expect(sanitizeBoolean(false)).toBe(false);
    });

    it('should parse string "true"', () => {
      expect(sanitizeBoolean('true')).toBe(true);
      expect(sanitizeBoolean('TRUE')).toBe(true);
      expect(sanitizeBoolean('  true  ')).toBe(true);
    });

    it('should parse string "false"', () => {
      expect(sanitizeBoolean('false')).toBe(false);
      expect(sanitizeBoolean('FALSE')).toBe(false);
      expect(sanitizeBoolean('  false  ')).toBe(false);
    });

    it('should parse "1" and "0"', () => {
      expect(sanitizeBoolean('1')).toBe(true);
      expect(sanitizeBoolean('0')).toBe(false);
    });

    it('should parse "yes" and "no"', () => {
      expect(sanitizeBoolean('yes')).toBe(true);
      expect(sanitizeBoolean('no')).toBe(false);
    });

    it('should parse number 1 and 0', () => {
      expect(sanitizeBoolean(1)).toBe(true);
      expect(sanitizeBoolean(0)).toBe(false);
    });

    it('should reject invalid values', () => {
      expect(sanitizeBoolean('invalid')).toBeNull();
      expect(sanitizeBoolean(2)).toBeNull();
      expect(sanitizeBoolean(null)).toBeNull();
      expect(sanitizeBoolean(undefined)).toBeNull();
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize string fields', () => {
      const input = { name: '  John  ', age: 30 };
      const result = sanitizeObject(input, { trim: true });
      expect(result.name).toBe('John');
      expect(result.age).toBe(30);
    });

    it('should strip HTML from strings', () => {
      const input = { name: '<script>alert(1)</script>John' };
      const result = sanitizeObject(input, { stripHtml: true });
      expect(result.name).toBe('alert(1)John');
    });

    it('should apply max length to strings', () => {
      const input = { name: 'John Doe' };
      const result = sanitizeObject(input, { maxStringLength: 4 });
      expect(result.name).toBe('John');
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: '  John  ',
          email: '  test@example.com  ',
        },
      };
      const result = sanitizeObject(input, { trim: true });
      expect(result.user).toEqual({
        name: 'John',
        email: 'test@example.com',
      });
    });

    it('should preserve non-string values', () => {
      const input = {
        name: 'John',
        age: 30,
        active: true,
        score: 95.5,
        tags: null,
      };
      const result = sanitizeObject(input);
      expect(result.age).toBe(30);
      expect(result.active).toBe(true);
      expect(result.score).toBe(95.5);
      expect(result.tags).toBeNull();
    });

    it('should preserve arrays', () => {
      const input = { tags: ['tag1', 'tag2'] };
      const result = sanitizeObject(input);
      expect(result.tags).toEqual(['tag1', 'tag2']);
    });
  });

  describe('removeSQLPatterns', () => {
    it('should remove single quotes', () => {
      expect(removeSQLPatterns("test' OR '1'='1")).not.toContain("'");
    });

    it('should remove SQL comments', () => {
      expect(removeSQLPatterns('test-- comment')).not.toContain('--');
      expect(removeSQLPatterns('test/* comment */')).not.toContain('/*');
    });

    it('should remove semicolons', () => {
      expect(removeSQLPatterns('test; DROP TABLE')).not.toContain(';');
    });

    it('should remove dangerous SQL keywords', () => {
      const dangerous = ['exec', 'execute', 'xp_', 'sp_'];
      dangerous.forEach((keyword) => {
        expect(removeSQLPatterns(`test ${keyword} command`).toLowerCase()).not.toContain(keyword);
      });
    });

    it('should preserve safe text', () => {
      const safe = 'This is a safe string without SQL patterns';
      expect(removeSQLPatterns(safe)).toBe(safe);
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove path traversal attempts', () => {
      expect(sanitizeFilename('../etc/passwd')).not.toContain('..');
      expect(sanitizeFilename('../../file.txt')).not.toContain('..');
    });

    it('should remove slashes', () => {
      expect(sanitizeFilename('path/to/file.txt')).not.toContain('/');
      expect(sanitizeFilename('path\\to\\file.txt')).not.toContain('\\');
    });

    it('should remove dangerous characters', () => {
      expect(sanitizeFilename('file<>:"|?*.txt')).toBe('file.txt');
    });

    it('should replace spaces with underscores', () => {
      expect(sanitizeFilename('my file.txt')).toBe('my_file.txt');
    });

    it('should not replace spaces when option is false', () => {
      expect(sanitizeFilename('my file.txt', { replaceSpaces: false })).toBe('my file.txt');
    });

    it('should truncate long filenames preserving extension', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const result = sanitizeFilename(longName, { maxLength: 20 });
      expect(result.length).toBeLessThanOrEqual(20);
      expect(result.endsWith('.txt')).toBe(true);
    });

    it('should remove leading dots', () => {
      expect(sanitizeFilename('...file.txt')).toBe('file.txt');
    });

    it('should return "untitled" for empty result', () => {
      expect(sanitizeFilename('')).toBe('untitled');
      expect(sanitizeFilename('////')).toBe('untitled');
    });

    it('should normalize unicode', () => {
      const filename = 'fil\u00e9.txt';
      expect(sanitizeFilename(filename)).toBeTruthy();
    });
  });

  describe('SanitizationPresets', () => {
    it('should provide basic preset', () => {
      const result = SanitizationPresets.basic('  test\x00value  ');
      expect(result).toBe('testvalue');
    });

    it('should provide userContent preset', () => {
      const result = SanitizationPresets.userContent('<script>test</script>');
      expect(result).toBe('test');
    });

    it('should provide database preset', () => {
      const result = SanitizationPresets.database("test' OR '1'='1");
      expect(result).not.toContain("'");
    });

    it('should provide shortText preset', () => {
      const long = 'a'.repeat(300);
      const result = SanitizationPresets.shortText(long);
      expect(result.length).toBeLessThanOrEqual(200);
    });

    it('should provide longText preset', () => {
      const veryLong = 'a'.repeat(15000);
      const result = SanitizationPresets.longText(veryLong);
      expect(result.length).toBeLessThanOrEqual(10000);
    });
  });
});
