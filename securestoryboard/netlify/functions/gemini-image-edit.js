const { 
  errorResponse, 
  successResponse, 
  optionsResponse, 
  validateEnvVars,
  parseJsonBody 
} = require('./utils/api-helpers');

const GEMINI_KEY = process.env.GEMINI_KEY;

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return optionsResponse();
  }

  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method not allowed', 'This endpoint only accepts POST requests', 'method_error');
  }

  try {
    validateEnvVars(['GEMINI_KEY']);
  } catch (error) {
    return errorResponse(500, 'Server configuration error', 'Gemini service not configured. Please contact support.', 'configuration_error');
  }

  try {
    const requestData = parseJsonBody(event);
    if (!requestData) {
      return errorResponse(400, 'Invalid request', 'Request body is required', 'validation_error');
    }

    const { prompt, imageData, mimeType = 'image/jpeg', additionalImages = [] } = requestData;

    if (!prompt) {
      return errorResponse(400, 'Missing prompt', 'A prompt is required to edit images', 'validation_error');
    }

    if (!imageData) {
      return errorResponse(400, 'Missing image', 'Image data is required for editing', 'validation_error');
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_KEY}`;

    // Build parts array with text and images
    const parts = [
      {
        text: prompt
      },
      {
        inline_data: {
          mime_type: mimeType,
          data: imageData
        }
      }
    ];

    // Add additional reference images if provided
    if (additionalImages && additionalImages.length > 0) {
      additionalImages.forEach((imgData, index) => {
        parts.push({
          inline_data: {
            mime_type: 'image/jpeg',
            data: imgData
          }
        });
      });
    }

    const requestBody = {
      contents: [{
        parts: parts
      }],
      generationConfig: {
        response_modalities: ["TEXT", "IMAGE"],
        temperature: 1.5
      },
      safetySettings: [
        {
          "category": "HARM_CATEGORY_HARASSMENT",
          "threshold": "BLOCK_NONE"
        },
        {
          "category": "HARM_CATEGORY_HATE_SPEECH",
          "threshold": "BLOCK_NONE"
        },
        {
          "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          "threshold": "BLOCK_NONE"
        },
        {
          "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
          "threshold": "BLOCK_NONE"
        }
      ]
    };

    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
    } catch (fetchError) {
      console.error('Gemini API fetch error:', fetchError);
      return errorResponse(502, 'External API error', 'Failed to connect to Gemini service. Please try again.', 'network_error');
    }

    let result;
    try {
      result = await response.json();
    } catch (jsonError) {
      console.error('Gemini API response parse error:', jsonError);
      return errorResponse(502, 'Invalid API response', 'Received invalid response from Gemini service', 'api_error');
    }

    console.log('Gemini 2.0 Flash Experimental processing:');
    console.log('- Model: gemini-2.0-flash-exp');
    console.log('- Temperature: 1.5 (high creativity)');
    console.log('- Safety filters: BLOCK_NONE (most permissive)');
    console.log('- Response modalities: TEXT, IMAGE');
    console.log('- Prompt:', prompt);
    
    if (!response.ok) {
      console.error('Gemini API Error:', result);
      
      let errorMessage = 'Image editing failed';
      if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      } else if (response.status === 403) {
        errorMessage = 'API access denied. Please check your Gemini API key.';
      } else if (result.error && result.error.message) {
        errorMessage = result.error.message;
      }
      
      return errorResponse(
        response.status === 429 ? 429 : 502,
        'Image editing failed',
        errorMessage,
        'gemini_error',
        result
      );
    }

    // Log the full response structure to understand it
    console.log('Gemini successful response structure:', JSON.stringify(result, null, 2));

    // Extract the generated image from Gemini response
    if (result.candidates && result.candidates[0]) {
      const candidate = result.candidates[0];
      
      if (candidate.content && candidate.content.parts) {
        const parts = candidate.content.parts;
        
        // Look for both inline_data (image) and text parts
        let imageData = null;
        let textContent = '';
        
        for (const part of parts) {
          if (part.inlineData) {
            // Note: might be inlineData instead of inline_data
            imageData = part.inlineData;
          } else if (part.inline_data) {
            imageData = part.inline_data;
          } else if (part.text) {
            textContent += part.text;
          }
        }
        
        if (imageData) {
          const mimeType = imageData.mimeType || imageData.mime_type || 'image/png';
          const imageBase64 = `data:${mimeType};base64,${imageData.data}`;
          return successResponse({ 
            image: imageBase64,
            text: textContent 
          });
        }
        
        // If no image data found, check if there's an error message in the text
        if (textContent) {
          console.error('Gemini returned text but no image:', textContent);
          return errorResponse(502, 'No image generated', textContent, 'generation_error');
        }
      }
    }

    console.error('Invalid Gemini API response structure:', JSON.stringify(result, null, 2));
    
    // Check if the response contains an error message
    if (result.error) {
      return errorResponse(502, 'Gemini API error', result.error.message || 'Unknown error', 'api_error');
    }
    
    return errorResponse(502, 'Invalid response format', 'Gemini service returned unexpected format', 'api_error');

  } catch (error) {
    console.error('Gemini image edit unexpected error:', error);
    
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
