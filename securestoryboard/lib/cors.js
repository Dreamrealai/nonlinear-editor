/**
 * CORS Security Utility
 *
 * Provides secure CORS validation to prevent wildcard origin acceptance.
 * Only allows requests from explicitly whitelisted origins.
 */

/**
 * Get the list of allowed origins from environment variables
 * @returns {string[]} Array of allowed origin URLs
 */
const getAllowedOrigins = () => {
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';

  // Parse comma-separated list of origins
  const origins = allowedOriginsEnv
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);

  // Default to localhost for development if no origins specified
  if (origins.length === 0) {
    console.warn('WARNING: No ALLOWED_ORIGINS configured. Defaulting to localhost only.');
    return [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ];
  }

  return origins;
};

/**
 * Validate if the request origin is allowed
 * @param {string} origin - The origin from the request headers
 * @returns {string|null} The validated origin or null if not allowed
 */
const validateOrigin = (origin) => {
  if (!origin) {
    return null;
  }

  const allowedOrigins = getAllowedOrigins();

  // Check if the origin is in the allowed list
  if (allowedOrigins.includes(origin)) {
    return origin;
  }

  // Log rejected origin for security monitoring
  console.warn(`CORS: Rejected origin "${origin}". Allowed origins:`, allowedOrigins);
  return null;
};

/**
 * Get CORS headers with validated origin
 * @param {object} event - The Netlify function event object
 * @param {object} options - Additional options for CORS headers
 * @returns {object} CORS headers object
 */
const getCorsHeaders = (event, options = {}) => {
  const {
    allowCredentials = true,
    allowedMethods = 'GET, POST, PUT, DELETE, OPTIONS',
    allowedHeaders = 'Content-Type, Authorization, X-Requested-With',
    maxAge = 86400 // 24 hours
  } = options;

  // Get and validate the origin
  const requestOrigin = event?.headers?.origin || event?.headers?.Origin;
  const validatedOrigin = validateOrigin(requestOrigin);

  // If no valid origin, use the first allowed origin as fallback
  // This prevents returning '*' which is a security risk
  const allowedOrigin = validatedOrigin || getAllowedOrigins()[0] || 'null';

  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': allowedMethods,
    'Access-Control-Allow-Headers': allowedHeaders,
    'Access-Control-Max-Age': maxAge.toString(),
  };

  // Only add credentials header if explicitly enabled and origin is valid
  if (allowCredentials && validatedOrigin) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
};

/**
 * Check if the request origin is allowed
 * Use this for additional security checks in function handlers
 * @param {object} event - The Netlify function event object
 * @returns {boolean} True if origin is allowed
 */
const isOriginAllowed = (event) => {
  const requestOrigin = event?.headers?.origin || event?.headers?.Origin;
  return validateOrigin(requestOrigin) !== null;
};

/**
 * Create a CORS error response for rejected origins
 * @param {object} event - The Netlify function event object
 * @returns {object} Netlify function response object
 */
const createCorsErrorResponse = (event) => {
  const requestOrigin = event?.headers?.origin || event?.headers?.Origin;

  return {
    statusCode: 403,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      error: 'Forbidden',
      message: 'Origin not allowed by CORS policy',
      origin: requestOrigin,
      timestamp: new Date().toISOString()
    })
  };
};

module.exports = {
  getAllowedOrigins,
  validateOrigin,
  getCorsHeaders,
  isOriginAllowed,
  createCorsErrorResponse
};
