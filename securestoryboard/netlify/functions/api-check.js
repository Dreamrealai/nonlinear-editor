const { 
  errorResponse, 
  successResponse, 
  optionsResponse, 
  validateEnvVars
} = require('./utils/api-helpers');

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return optionsResponse();
  }

  if (event.httpMethod !== 'GET') {
    return errorResponse(405, 'Method not allowed', 'This endpoint only accepts GET requests', 'method_error');
  }

  try {
    const checks = {
      gemini: false,
      flux: false,
      errors: [],
      debug: {
        FAL_KEY_EXISTS: !!process.env.FAL_KEY,
        FAL_KEY_LENGTH: process.env.FAL_KEY ? process.env.FAL_KEY.length : 0,
        GEMINI_KEY_EXISTS: !!process.env.GEMINI_KEY,
        GEMINI_KEY_LENGTH: process.env.GEMINI_KEY ? process.env.GEMINI_KEY.length : 0
      }
    };

    // Check Gemini configuration
    try {
      validateEnvVars(['GEMINI_KEY']);
      checks.gemini = true;
    } catch (error) {
      checks.errors.push('GEMINI_KEY not configured');
    }

    // Check Flux/FAL configuration
    try {
      validateEnvVars(['FAL_KEY']);
      checks.flux = true;
    } catch (error) {
      checks.errors.push('FAL_KEY not configured');
    }

    // Don't test FAL API connectivity in the check endpoint
    // Just verify the key exists

    return successResponse({
      status: 'ok',
      services: {
        gemini: checks.gemini ? 'configured' : 'not configured',
        flux: checks.flux ? 'configured' : 'not configured'
      },
      errors: checks.errors.length > 0 ? checks.errors : undefined,
      debug: checks.debug,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API check error:', error);
    return errorResponse(
      500,
      'Internal server error',
      error.message || 'Failed to check API configuration',
      'check_error'
    );
  }
};
