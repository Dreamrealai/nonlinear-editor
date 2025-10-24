/**
 * Password strength validation utility
 * Enforces strong password requirements across the application
 */

export interface PasswordValidationResult {
  valid: boolean;
  message?: string;
  errors?: string[];
}

export interface PasswordStrength {
  score: number;
  feedback: string;
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

/**
 * Validate password meets minimum requirements
 * @param password - The password to validate
 * @param confirmPassword - Optional password confirmation to check match
 * @returns Error message if invalid, null if valid
 */
export function validatePassword(password: string, confirmPassword?: string): string | null {
  if (password.length < MIN_LENGTH) {
    return 'Password must be at least 8 characters long';
  }

  if (!LOWERCASE_REGEX.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }

  if (!UPPERCASE_REGEX.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }

  if (!NUMBER_REGEX.test(password)) {
    return 'Password must contain at least one number';
  }

  if (!SPECIAL_CHARS_REGEX.test(password)) {
    return 'Password must contain at least one special character';
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return 'Passwords do not match';
  }

  return null;
}

/**
 * Calculate password strength with 0-6 scoring (for backwards compatibility)
 * @param password - The password to evaluate
 * @returns Object containing score (0-6) and feedback text
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, feedback: '' };
  }

  let score = 0;

  // Length checks
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Character variety checks
  if (LOWERCASE_REGEX.test(password)) score++;
  if (UPPERCASE_REGEX.test(password)) score++;
  if (NUMBER_REGEX.test(password)) score++;
  if (SPECIAL_CHARS_REGEX.test(password)) score++;

  // Determine feedback based on score
  let feedback = '';
  if (score <= 2) feedback = 'Weak';
  else if (score <= 4) feedback = 'Fair';
  else if (score <= 5) feedback = 'Good';
  else feedback = 'Strong';

  return { score, feedback };
}

/**
 * Get the Tailwind CSS background color class for password strength indicator
 * @param score - The password strength score (0-6)
 * @returns Tailwind CSS background color class
 */
export function getPasswordStrengthColor(score: number): string {
  if (score <= 2) return 'bg-red-500';
  if (score <= 4) return 'bg-yellow-500';
  if (score <= 5) return 'bg-blue-500';
  return 'bg-green-500';
}
