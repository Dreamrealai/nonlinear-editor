/**
 * Email validation utility
 * Provides robust client-side email validation
 */

// RFC 5322 compliant email regex (simplified but robust)
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export interface EmailValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Validates email format with detailed error messages
 */
export function validateEmail(email: string): EmailValidationResult {
  // Trim whitespace
  const trimmed = email.trim();

  if (!trimmed) {
    return {
      valid: false,
      message: 'Email is required',
    };
  }

  if (trimmed.length > 254) {
    return {
      valid: false,
      message: 'Email is too long (max 254 characters)',
    };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return {
      valid: false,
      message: 'Please enter a valid email address',
    };
  }

  // Check for common typos
  // Safely split and validate email parts
  const parts = trimmed.split('@');

  // Validate we have exactly 2 parts (should be guaranteed by regex, but defensive)
  if (parts.length !== 2) {
    return {
      valid: false,
      message: 'Please enter a valid email address',
    };
  }

  const [localPart, domain] = parts;

  // Validate parts are not empty (should be guaranteed by regex, but defensive)
  if (!localPart || !domain) {
    return {
      valid: false,
      message: 'Please enter a valid email address',
    };
  }

  const commonTyops = ['gmial.com', 'gmai.com', 'yahooo.com', 'yaho.com', 'hotmial.com'];

  if (commonTyops.includes(domain.toLowerCase())) {
    const suggestions = {
      'gmial.com': 'gmail.com',
      'gmai.com': 'gmail.com',
      'yahooo.com': 'yahoo.com',
      'yaho.com': 'yahoo.com',
      'hotmial.com': 'hotmail.com',
    };

    return {
      valid: false,
      message: `Did you mean ${localPart}@${suggestions[domain.toLowerCase() as keyof typeof suggestions]}?`,
    };
  }

  return { valid: true };
}

/**
 * Normalize email for storage (trim and lowercase)
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
