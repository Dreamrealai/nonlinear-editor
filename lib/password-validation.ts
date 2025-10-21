export interface PasswordStrength {
  score: number;
  feedback: string;
}

/**
 * Calculate password strength based on various criteria
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
  if (/[a-z]/.test(password)) score++; // Lowercase
  if (/[A-Z]/.test(password)) score++; // Uppercase
  if (/[0-9]/.test(password)) score++; // Numbers
  if (/[^a-zA-Z0-9]/.test(password)) score++; // Special characters

  // Determine feedback based on score
  let feedback = '';
  if (score <= 2) feedback = 'Weak';
  else if (score <= 4) feedback = 'Fair';
  else if (score <= 5) feedback = 'Good';
  else feedback = 'Strong';

  return { score, feedback };
}

/**
 * Get the Tailwind CSS color class for password strength indicator
 * @param score - The password strength score (0-6)
 * @returns Tailwind CSS background color class
 */
export function getPasswordStrengthColor(score: number): string {
  if (score <= 2) return 'bg-red-500';
  if (score <= 4) return 'bg-yellow-500';
  if (score <= 5) return 'bg-blue-500';
  return 'bg-green-500';
}

/**
 * Validate password meets minimum requirements
 * @param password - The password to validate
 * @param confirmPassword - Optional password confirmation to check match
 * @returns Error message if invalid, null if valid
 */
export function validatePassword(
  password: string,
  confirmPassword?: string
): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }

  const strength = calculatePasswordStrength(password);
  if (strength.score < 3) {
    return 'Please use a stronger password';
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return 'Passwords do not match';
  }

  return null;
}
