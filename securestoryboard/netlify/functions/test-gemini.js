const { 
  errorResponse, 
  successResponse, 
  optionsResponse, 
  validateEnvVars
} = require('./utils/api-helpers');

const GEMINI_KEY = process.env.GEMINI_KEY;

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return optionsResponse();
  }

  if (event.httpMethod !== 'GET') {
    return errorResponse(405, 'Method not allowed', 'This endpoint only accepts GET requests', 'method_error');
  }

  try {
    validateEnvVars(['GEMINI_KEY']);
  } catch (error) {
    return errorResponse(500, 'Server configuration error', 'Gemini service not configured', 'configuration_error');
  }

  try {
    // Simple test to generate an image
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${GEMINI_KEY}`;

    const requestBody = {
      contents: [{
        parts: [{
          text: "Generate a simple test image of a blue square"
        }]
      }],
      generationConfig: {
        response_modalities: ["IMAGE", "TEXT"]
      }
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();

    return successResponse({
      status: response.status,
      ok: response.ok,
      result: result,
      interpretation: {
        hasError: !!result.error,
        hasCandidates: !!(result.candidates && result.candidates.length > 0),
        candidateStructure: result.candidates ? result.candidates[0] : null
      }
    });

  } catch (error) {
    console.error('Gemini test error:', error);
    return errorResponse(500, 'Test failed', error.message, 'test_error');
  }
};
