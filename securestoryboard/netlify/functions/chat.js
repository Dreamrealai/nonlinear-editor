const cookie = require('cookie');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'storyboard-secret-2024';
const GEMINI_KEY = process.env.GEMINI_KEY;

// Verify authentication - COMMENTED OUT FOR NOW
const verifyAuth = (event) => {
  // Authentication disabled - always return true
  return true;
  
  /* ORIGINAL AUTH CODE - UNCOMMENT TO RE-ENABLE
  const cookies = cookie.parse(event.headers.cookie || '');
  const token = cookies.auth_token;
  
  if (!token) {
    throw new Error('No authentication token');
  }
  
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch (error) {
    throw new Error('Invalid authentication token');
  }
  */
};

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
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
      body: JSON.stringify({ error: 'Server configuration error: Missing API key' })
    };
  }

  const GEMINI_FLASH_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_KEY}`;

  try {
    // Verify authentication - DISABLED FOR NOW
    // verifyAuth(event);

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    const { convo } = JSON.parse(event.body);

    if (!convo || !Array.isArray(convo)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid conversation data' })
      };
    }

    // Add timeout control for Gemini API call
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000); // 25 second timeout (leaving 1s buffer for Netlify's 26s limit)
    
    let response;
    try {
      response = await fetch(GEMINI_FLASH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: convo,
          generationConfig: {
            temperature: 0.7
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_NONE"
            }
          ]
        }),
        signal: controller.signal
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        return {
          statusCode: 408,
          headers,
          body: JSON.stringify({ 
            error: 'Request timeout - response took too long. Try shortening your message or breaking it into smaller parts.',
            type: 'timeout'
          })
        };
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    const result = await response.json();
    
    // Check for API errors first
    if (result.error) {
      console.error('Gemini API error:', result.error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Gemini API error',
          message: result.error.message || 'Unknown API error',
          details: result.error
        })
      };
    }
    
    // Check if response was blocked by safety filters
    if (result.candidates?.[0]?.finishReason === 'SAFETY') {
      console.error('Response blocked by safety filters');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Response blocked by safety filters',
          message: 'The content was blocked by Gemini\'s safety filters. Try rephrasing your request.'
        })
      };
    }
    
    // Extract reply with fallback logic (same as in test-gemini)
    let reply = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // If not found in expected location, search for it
    if (!reply && result?.candidates) {
      for (const candidate of result.candidates) {
        if (candidate?.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part?.text) {
              reply = part.text;
              break;
            }
          }
        }
        if (reply) break;
      }
    }

    if (!reply) {
      console.error('Gemini response structure:', JSON.stringify(result, null, 2));
      
      // Provide more context about why there's no response
      let errorDetails = 'No text content in Gemini response';
      if (!result.candidates || result.candidates.length === 0) {
        errorDetails = 'No candidates in response';
      } else if (result.candidates[0]?.finishReason) {
        errorDetails = `Response finished with reason: ${result.candidates[0].finishReason}`;
      }
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'No response from Gemini',
          message: errorDetails,
          finishReason: result.candidates?.[0]?.finishReason
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply })
    };

  } catch (error) {
    console.error('Chat error:', error);
    return {
      statusCode: error.message.includes('authentication') ? 401 : 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
