/**
 * Password strength validation utility
 * Enforces strong password requirements across the application
 */

export interface PasswordValidationResult {
  valid: boolean;
  message?: string;
  errors?: string[];
}

const MIN_LENGTH = 8;
const SPECIAL_CHARS_REGEX = /[!@#$%^&*(),.?":{}|<>]/;
const UPPERCASE_REGEX = /[A-Z]/;
const LOWERCASE_REGEX = /[a-z]/;
const NUMBER_REGEX = /[0-9]/;

/**
 * Validates password strength with detailed error messages
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < MIN_LENGTH) {
    errors.push(`At least ${MIN_LENGTH} characters`);
  }

  if (!UPPERCASE_REGEX.test(password)) {
    errors.push('One uppercase letter');
  }

  if (!LOWERCASE_REGEX.test(password)) {
    errors.push('One lowercase letter');
  }

  if (!NUMBER_REGEX.test(password)) {
    errors.push('One number');
  }

  if (!SPECIAL_CHARS_REGEX.test(password)) {
    errors.push('One special character (!@#$%^&*...)');
  }

  if (errors.length === 0) {
    return { valid: true };
  }

  return {
    valid: false,
    message: `Password must contain: ${errors.join(', ')}`,
    errors,
  };
}

/**
 * Get password strength score (0-100)
 */
export function getPasswordStrength(password: string): number {
  let score = 0;

  // Length score (up to 40 points)
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;

  // Character type scores (15 points each, but reduced for short passwords)
  const charTypePoints = password.length < 8 ? 10 : 15;
  if (UPPERCASE_REGEX.test(password)) score += charTypePoints;
  if (LOWERCASE_REGEX.test(password)) score += charTypePoints;
  if (NUMBER_REGEX.test(password)) score += charTypePoints;
  if (SPECIAL_CHARS_REGEX.test(password)) score += charTypePoints;

  return Math.min(100, score);
}

/**
 * Get password strength label
 */
export function getPasswordStrengthLabel(score: number): {
  label: string;
  color: string;
} {
  if (score >= 80) {
    return { label: 'Strong', color: 'text-green-600' };
  } else if (score >= 60) {
    return { label: 'Good', color: 'text-blue-600' };
  } else if (score >= 40) {
    return { label: 'Fair', color: 'text-yellow-600' };
  } else {
    return { label: 'Weak', color: 'text-red-600' };
  }
}
