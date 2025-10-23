const { 
  errorResponse, 
  successResponse, 
  optionsResponse, 
  validateEnvVars,
  parseJsonBody 
} = require('./utils/api-helpers');

const FAL_KEY = process.env.FAL_KEY;

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return optionsResponse();
  }

  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method not allowed', 'This endpoint only accepts POST requests', 'method_error');
  }

  try {
    validateEnvVars(['FAL_KEY']);
  } catch (error) {
    return errorResponse(500, 'Server configuration error', 'Flux service not configured. Please contact support.', 'configuration_error');
  }

  try {
    const requestData = parseJsonBody(event);
    if (!requestData) {
      return errorResponse(400, 'Invalid request', 'Request body is required', 'validation_error');
    }

    const { prompt, imageData, referenceImages } = requestData;

    if (!prompt) {
      return errorResponse(400, 'Missing prompt', 'A prompt is required to edit images', 'validation_error');
    }

    if (!imageData) {
      return errorResponse(400, 'Missing image', 'Image data is required for editing', 'validation_error');
    }

    console.log('Flux Kontext Max processing:');
    console.log('- Prompt:', prompt);
    console.log('- Image data length:', imageData ? imageData.length : 'undefined');
    console.log('- Reference images count:', referenceImages ? referenceImages.length : 0);
    console.log('- Safety tolerance: 5 (maximum permissiveness)');
    
    // Create main image data URL for FAL API
    const mainImageUrl = `data:image/jpeg;base64,${imageData}`;

    // Process with Flux Kontext Max (using FAL API)
    const falApiUrl = 'https://fal.run/fal-ai/flux-pro/kontext/max';
    
    console.log('Processing with Flux Kontext Max:');
    console.log('- API URL:', falApiUrl);
    console.log('- Prompt:', prompt);
    console.log('- Safety tolerance:', 5);
    
    const requestPayload = {
      prompt: prompt,
      image_url: mainImageUrl,
      safety_tolerance: "5",
      output_format: "jpeg",
      sync_mode: true
    };
    
    console.log('Request payload (excluding image data):', {
      ...requestPayload,
      image_url: '[BASE64_DATA_URL]'
    });
    
    let response;
    try {
      // Create a timeout promise (180 seconds = 3 minutes for processing)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Processing timeout')), 180000)
      );
      
      // Make request to FAL API
      response = await Promise.race([
        fetch(falApiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Key ${FAL_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload)
        }),
        timeoutPromise
      ]);
    } catch (fetchError) {
      console.error('FAL Kontext Max API fetch error:', fetchError);
      if (fetchError.message === 'Processing timeout') {
        return errorResponse(504, 'Processing timeout', 'Image processing timed out. This may happen with complex edits. Please try again with a simpler prompt.', 'timeout_error');
      }
      return errorResponse(502, 'External API error', 'Failed to connect to FAL Kontext Max service. Please try again.', 'network_error');
    }

    let result;
    let responseText;
    try {
      responseText = await response.text();
      console.log('FAL Kontext Max API response status:', response.status);
      console.log('FAL Kontext Max API response text:', responseText);
      
      result = JSON.parse(responseText);
    } catch (jsonError) {
      console.error('FAL Kontext Max API response parse error:', jsonError);
      console.error('Raw response:', responseText);
      return errorResponse(502, 'Invalid API response', `Received invalid response from FAL Kontext Max service: ${responseText}`, 'api_error');
    }

    if (!response.ok) {
      console.error('FAL Kontext Max API Error - Status:', response.status);
      console.error('FAL Kontext Max API Error - Result:', result);
      console.error('Full error details:', JSON.stringify(result, null, 2));
      
      let errorMessage = 'Image editing failed';
      
      // Try to extract error message from various possible locations
      if (result) {
        if (typeof result === 'string') {
          errorMessage = result;
        } else if (result.detail) {
          errorMessage = typeof result.detail === 'string' ? result.detail : JSON.stringify(result.detail);
        } else if (result.message) {
          errorMessage = result.message;
        } else if (result.error) {
          errorMessage = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
        } else if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
          errorMessage = result.errors.map(e => e.message || e).join(', ');
        } else {
          errorMessage = `API Error ${response.status}: ${JSON.stringify(result)}`;
        }
      }
      
      // Special handling for specific status codes
      if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      } else if (response.status === 402) {
        errorMessage = 'FAL quota exceeded. Please try again later.';
      } else if (response.status === 401) {
        errorMessage = 'Authentication failed. Please check your FAL API key.';
      } else if (response.status === 400) {
        errorMessage = `Invalid request: ${errorMessage}`;
      }
      
      return errorResponse(
        response.status,
        'Image editing failed',
        errorMessage,
        'fal_kontext_max_error'
      );
    }

    // Validate the response has the expected structure
    if (!result.images || !Array.isArray(result.images) || result.images.length === 0) {
      console.error('Invalid FAL Kontext Max API response structure:', result);
      return errorResponse(502, 'Invalid response format', 'FAL Kontext Max service returned unexpected format', 'api_error');
    }

    console.log('FAL Kontext Max processing completed successfully');
    return successResponse({ image: result.images[0].url });

  } catch (error) {
    console.error('Flux image edit unexpected error:', error);
    console.error('Error stack:', error.stack);
    
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return errorResponse(504, 'Request timeout', 'Image editing took too long. Please try again.', 'timeout_error');
    }
    
    return errorResponse(
      500,
      'Internal server error',
      error.message || 'An unexpected error occurred',
      'internal_error'
    );
  }
};
