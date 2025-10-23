const cookie = require('cookie');
const { getCorsHeaders } = require('../../lib/cors');

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'storyboard-secret-2024';
const GEMINI_KEY = process.env.GEMINI_KEY;



exports.handler = async (event, context) => {
  const headers = {
    ...getCorsHeaders(event, {
      allowCredentials: true,
      allowedMethods: 'POST, OPTIONS',
      allowedHeaders: 'Content-Type'
    }),
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Check for required environment variables
  if (!GEMINI_KEY) {
    console.error('GEMINI_KEY environment variable is not set');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Server configuration error', 
        message: 'API key not configured. Please contact support.',
        type: 'configuration_error'
      })
    };
  }

  const GEMINI_PRO_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_KEY}`;

  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ 
          error: 'Method not allowed',
          message: 'This endpoint only accepts POST requests',
          type: 'method_error'
        })
      };
    }

    let requestData;
    try {
      requestData = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid request body',
          message: 'Request body must be valid JSON',
          type: 'parse_error'
        })
      };
    }

    const { contents } = requestData;

    if (!contents || !Array.isArray(contents)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid contents',
          message: 'Contents must be an array',
          type: 'validation_error'
        })
      };
    }

    // Simply proxy to Gemini
    let response;
    try {
      response = await fetch(GEMINI_PRO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: contents,
          generationConfig: requestData.generationConfig || {}
        })
      });
    } catch (fetchError) {
      console.error('Gemini API fetch error:', fetchError);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ 
          error: 'External API error',
          message: 'Failed to connect to AI service. Please try again.',
          type: 'network_error'
        })
      };
    }

    let result;
    try {
      result = await response.json();
    } catch (jsonError) {
      console.error('Gemini API response parse error:', jsonError);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid API response',
          message: 'Received invalid response from AI service',
          type: 'api_error'
        })
      };
    }

    if (!response.ok) {
      console.error('Gemini API error response:', result);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ 
          error: 'AI service error',
          message: result.error?.message || 'The AI service encountered an error',
          type: 'gemini_error',
          details: result
        })
      };
    }

    // Return the full Gemini response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Generate prompts unexpected error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred',
        type: 'internal_error'
      })
    };
  }
};
