// Common headers for all API responses
const getCorsHeaders = () => {
  // In production, replace * with your actual domain
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  };
};

// Standard error response format
const errorResponse = (statusCode, error, message, type = 'error', details = null) => {
  const body = {
    error,
    message,
    type,
    timestamp: new Date().toISOString()
  };
  
  if (details && process.env.NODE_ENV !== 'production') {
    body.details = details;
  }
  
  return {
    statusCode,
    headers: getCorsHeaders(),
    body: JSON.stringify(body)
  };
};

// Standard success response format
const successResponse = (data, statusCode = 200) => {
  return {
    statusCode,
    headers: getCorsHeaders(),
    body: JSON.stringify(data)
  };
};

// Options response for CORS preflight
const optionsResponse = () => {
  return {
    statusCode: 200,
    headers: getCorsHeaders(),
    body: ''
  };
};

// Validate required environment variables
const validateEnvVars = (requiredVars) => {
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

// Simple request validation
const validateRequestBody = (body, requiredFields) => {
  if (!body) {
    throw new Error('Request body is required');
  }
  
  const missing = requiredFields.filter(field => !body[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
};

// Parse JSON body safely
const parseJsonBody = (event) => {
  if (!event.body) {
    return null;
  }
  
  try {
    return JSON.parse(event.body);
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
};

module.exports = {
  getCorsHeaders,
  errorResponse,
  successResponse,
  optionsResponse,
  validateEnvVars,
  validateRequestBody,
  parseJsonBody
};
