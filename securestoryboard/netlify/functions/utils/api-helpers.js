const { getCorsHeaders: getSecureCorsHeaders } = require('../../lib/cors');

// Common headers for all API responses
const getCorsHeaders = (event) => {
  const corsHeaders = getSecureCorsHeaders(event, {
    allowCredentials: true,
    allowedMethods: 'GET, POST, OPTIONS',
    allowedHeaders: 'Content-Type, Authorization, X-Requested-With'
  });

  return {
    ...corsHeaders,
    'Content-Type': 'application/json'
  };
};

// Standard error response format
const errorResponse = (statusCode, error, message, type = 'error', details = null, event = null) => {
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
    headers: getCorsHeaders(event),
    body: JSON.stringify(body)
  };
};

// Standard success response format
const successResponse = (data, statusCode = 200, event = null) => {
  return {
    statusCode,
    headers: getCorsHeaders(event),
    body: JSON.stringify(data)
  };
};

// Options response for CORS preflight
const optionsResponse = (event = null) => {
  return {
    statusCode: 200,
    headers: getCorsHeaders(event),
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
