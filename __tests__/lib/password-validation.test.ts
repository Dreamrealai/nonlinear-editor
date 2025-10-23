import {
  calculatePasswordStrength,
  getPasswordStrengthColor,
  validatePassword,
} from '@/lib/password-validation'

describe('Password Validation', () => {
  describe('calculatePasswordStrength', () => {
    it('should return score 0 for empty password', () => {
      const result = calculatePasswordStrength('')
      expect(result.score).toBe(0)
      expect(result.feedback).toBe('')
    })

    it('should give low score for weak passwords', () => {
      const result = calculatePasswordStrength('abc')
      expect(result.score).toBeLessThanOrEqual(2)
      expect(result.feedback).toBe('Weak')
    })

    it('should give medium score for fair passwords', () => {
      const result = calculatePasswordStrength('abcd1234')
      expect(result.score).toBeGreaterThan(2)
      expect(result.score).toBeLessThanOrEqual(4)
      expect(result.feedback).toBe('Fair')
    })

    it('should give high score for good passwords', () => {
      const result = calculatePasswordStrength('Abcd1234!')
      expect(result.score).toBeGreaterThan(4)
      expect(['Good', 'Strong']).toContain(result.feedback)
    })

    it('should give maximum score for strong passwords', () => {
      const result = calculatePasswordStrength('MyP@ssw0rd123!')
      expect(result.score).toBe(6)
      expect(result.feedback).toBe('Strong')
    })

    it('should reward password length', () => {
      const short = calculatePasswordStrength('Abc123!')
      const long = calculatePasswordStrength('Abc123!LongPassword')
      expect(long.score).toBeGreaterThan(short.score)
    })

    it('should check for lowercase letters', () => {
      const withLower = calculatePasswordStrength('abc123')
      const withoutLower = calculatePasswordStrength('ABC123')
      // Both have numbers, so the difference should be the lowercase presence
      expect(withLower.score).toBeGreaterThanOrEqual(withoutLower.score)
      // Verify lowercase is counted
      const onlyLower = calculatePasswordStrength('abcdef')
      expect(onlyLower.score).toBeGreaterThanOrEqual(1)
    })

    it('should check for uppercase letters', () => {
      const withUpper = calculatePasswordStrength('ABCdef')
      const withoutUpper = calculatePasswordStrength('abcdef')
      expect(withUpper.score).toBeGreaterThan(withoutUpper.score)
    })

    it('should check for numbers', () => {
      const withNumbers = calculatePasswordStrength('abc123')
      const withoutNumbers = calculatePasswordStrength('abcdef')
      expect(withNumbers.score).toBeGreaterThan(withoutNumbers.score)
    })

    it('should check for special characters', () => {
      const withSpecial = calculatePasswordStrength('abc123!')
      const withoutSpecial = calculatePasswordStrength('abc123')
      expect(withSpecial.score).toBeGreaterThan(withoutSpecial.score)
    })
  })

  describe('getPasswordStrengthColor', () => {
    it('should return red for weak passwords', () => {
      expect(getPasswordStrengthColor(0)).toBe('bg-red-500')
      expect(getPasswordStrengthColor(1)).toBe('bg-red-500')
      expect(getPasswordStrengthColor(2)).toBe('bg-red-500')
    })

    it('should return yellow for fair passwords', () => {
      expect(getPasswordStrengthColor(3)).toBe('bg-yellow-500')
      expect(getPasswordStrengthColor(4)).toBe('bg-yellow-500')
    })

    it('should return blue for good passwords', () => {
      expect(getPasswordStrengthColor(5)).toBe('bg-blue-500')
    })

    it('should return green for strong passwords', () => {
      expect(getPasswordStrengthColor(6)).toBe('bg-green-500')
    })
  })

  describe('validatePassword', () => {
    it('should reject passwords shorter than 8 characters', () => {
      const result = validatePassword('Short1!')
      expect(result).toBe('Password must be at least 8 characters long')
    })

    it('should reject passwords without lowercase letters', () => {
      const result = validatePassword('PASSWORD123!')
      expect(result).toBe('Password must contain at least one lowercase letter')
    })

    it('should reject passwords without uppercase letters', () => {
      const result = validatePassword('password123!')
      expect(result).toBe('Password must contain at least one uppercase letter')
    })

    it('should reject passwords without numbers', () => {
      const result = validatePassword('Password!')
      expect(result).toBe('Password must contain at least one number')
    })

    it('should reject passwords without special characters', () => {
      const result = validatePassword('Password123')
      expect(result).toBe('Password must contain at least one special character')
    })

    it('should accept valid passwords', () => {
      const result = validatePassword('ValidPass123!')
      expect(result).toBeNull()
    })

    it('should validate password confirmation match', () => {
      const result = validatePassword('ValidPass123!', 'ValidPass123!')
      expect(result).toBeNull()
    })

    it('should reject mismatched password confirmation', () => {
      const result = validatePassword('ValidPass123!', 'DifferentPass123!')
      expect(result).toBe('Passwords do not match')
    })

    it('should not check confirmation if not provided', () => {
      const result = validatePassword('ValidPass123!')
      expect(result).toBeNull()
    })
  })
})
