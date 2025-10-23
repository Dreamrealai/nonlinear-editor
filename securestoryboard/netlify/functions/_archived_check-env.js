// Simple endpoint to check environment configuration
const { successResponse, optionsResponse } = require('./utils/api-helpers');

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return optionsResponse();
  }

  // Check which environment variables are set (without exposing values)
  const envStatus = {
    GEMINI_KEY: !!process.env.GEMINI_KEY,
    FAL_KEY: !!process.env.FAL_KEY,
    NODE_ENV: process.env.NODE_ENV || 'not set',
    CONTEXT: process.env.CONTEXT || 'not set',
    DEPLOY_ID: process.env.DEPLOY_ID ? 'set' : 'not set',
    URL: process.env.URL || 'not set',
    SITE_ID: process.env.SITE_ID || 'not set'
  };

  // If GEMINI_KEY exists, show first few characters
  if (process.env.GEMINI_KEY) {
    envStatus.GEMINI_KEY_PREVIEW = process.env.GEMINI_KEY.substring(0, 8) + '...';
  }

  return successResponse({
    message: 'Environment check',
    timestamp: new Date().toISOString(),
    environment: envStatus,
    functionPath: __dirname,
    nodeVersion: process.version
  });
};
