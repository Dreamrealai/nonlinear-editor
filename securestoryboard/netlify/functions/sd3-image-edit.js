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

    const { prompt, imageData } = requestData;

    if (!prompt) {
      return errorResponse(400, 'Missing prompt', 'A prompt is required to edit images', 'validation_error');
    }

    if (!imageData) {
      return errorResponse(400, 'Missing image', 'Image data is required for editing', 'validation_error');
    }

    // Try the image-to-image endpoint which might accept base64 directly
    const dataUrl = `data:image/jpeg;base64,${imageData}`;
    const falApiUrl = 'https://fal.run/fal-ai/stable-diffusion-v3-medium/image-to-image';
    
    console.log('Trying Stable Diffusion v3 image-to-image API');
    
    let response;
    try {
      response = await fetch(falApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          image_url: dataUrl,
          strength: 0.85,
          guidance_scale: 7.5,
          num_inference_steps: 25,
          num_images: 1,
          enable_safety_checker: true,
          sync_mode: true
        })
      });
    } catch (fetchError) {
      console.error('SD3 API fetch error:', fetchError);
      return errorResponse(502, 'External API error', 'Failed to connect to image service. Please try again.', 'network_error');
    }

    let result;
    try {
      const responseText = await response.text();
      console.log('SD3 API response status:', response.status);
      console.log('SD3 API response (first 500 chars):', responseText.substring(0, 500));
      
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', responseText);
        throw new Error('Invalid JSON response from API');
      }
    } catch (jsonError) {
      console.error('API response parse error:', jsonError);
      return errorResponse(502, 'Invalid API response', 'Received invalid response from image service', 'api_error');
    }

    if (!response.ok) {
      console.error('API Error:', result);
      
      let errorMessage = 'Image editing failed';
      if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      } else if (response.status === 402) {
        errorMessage = 'API quota exceeded. Please try again later.';
      } else if (response.status === 401) {
        errorMessage = 'Authentication failed. Please check your API key.';
      } else if (result.detail || result.message || result.error) {
        errorMessage = result.detail || result.message || result.error;
      }
      
      return errorResponse(
        response.status === 429 ? 429 : 502,
        'Image editing failed',
        errorMessage,
        'api_error',
        result
      );
    }

    // Check various response formats
    let imageUrl;
    if (result.images && Array.isArray(result.images) && result.images.length > 0) {
      imageUrl = result.images[0].url || result.images[0];
    } else if (result.image) {
      imageUrl = result.image;
    } else if (result.url) {
      imageUrl = result.url;
    } else if (result.output) {
      imageUrl = result.output;
    }

    if (!imageUrl) {
      console.error('No image URL found in response:', result);
      return errorResponse(502, 'Invalid response format', 'Image service returned unexpected format', 'api_error');
    }

    return successResponse({ image: imageUrl });

  } catch (error) {
    console.error('Image edit unexpected error:', error);
    
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
