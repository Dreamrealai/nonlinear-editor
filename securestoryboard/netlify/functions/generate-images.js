const { 
  errorResponse, 
  successResponse, 
  optionsResponse, 
  validateEnvVars,
  parseJsonBody 
} = require('./utils/api-helpers');

const FAL_KEY = process.env.FAL_KEY;
const FAL_URLS = {
  imagen3: 'https://fal.run/fal-ai/imagen3',
  imagen4: 'https://fal.run/fal-ai/imagen4/preview'
};



exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return optionsResponse(event);
  }

  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method not allowed', 'This endpoint only accepts POST requests', 'method_error', null, event);
  }

  try {
    validateEnvVars(['FAL_KEY']);
  } catch (error) {
    return errorResponse(500, 'Server configuration error', 'Image generation service not configured. Please contact support.', 'configuration_error', null, event);
  }

  try {
    const requestData = parseJsonBody(event);
    if (!requestData) {
      return errorResponse(400, 'Invalid request', 'Request body is required', 'validation_error', null, event);
    }

    const { prompt, model = 'imagen3' } = requestData;

    if (!prompt) {
      return errorResponse(400, 'Missing prompt', 'A prompt is required to generate images', 'validation_error', null, event);
    }

    const apiUrl = FAL_URLS[model];
    if (!apiUrl) {
      return errorResponse(400, 'Invalid model', `Model "${model}" is not supported. Available models: imagen3, imagen4`, 'validation_error', null, event);
    }

    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          aspect_ratio: '16:9',
          num_images: 2
        })
      });
    } catch (fetchError) {
      console.error('FAL API fetch error:', fetchError);
      return errorResponse(502, 'External API error', 'Failed to connect to image generation service. Please try again.', 'network_error', null, event);
    }

    let result;
    try {
      result = await response.json();
    } catch (jsonError) {
      console.error('FAL API response parse error:', jsonError);
      return errorResponse(502, 'Invalid API response', 'Received invalid response from image generation service', 'api_error', null, event);
    }

    if (!response.ok) {
      console.error('FAL API Error:', result);

      // Handle specific FAL API errors
      let errorMessage = 'Image generation failed';
      if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      } else if (response.status === 402) {
        errorMessage = 'Image generation quota exceeded. Please try again later.';
      } else if (result.detail || result.message) {
        errorMessage = result.detail || result.message;
      }

      return errorResponse(
        response.status === 429 ? 429 : 502,
        'Image generation failed',
        errorMessage,
        'fal_error',
        result,
        event
      );
    }

    // Validate the response has the expected structure
    if (!result.images || !Array.isArray(result.images)) {
      console.error('Invalid FAL API response structure:', result);
      return errorResponse(502, 'Invalid response format', 'Image generation service returned unexpected format', 'api_error', null, event);
    }

    return successResponse(result, 200, event);

  } catch (error) {
    console.error('Generate images unexpected error:', error);

    // Check if it's a timeout error
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return errorResponse(504, 'Request timeout', 'Image generation took too long. Please try again.', 'timeout_error', null, event);
    }

    return errorResponse(
      500,
      'Internal server error',
      error.message || 'An unexpected error occurred',
      'internal_error',
      null,
      event
    );
  }
};
