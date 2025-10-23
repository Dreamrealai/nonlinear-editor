// Just test if we can reach Gemini API without generating text
const { errorResponse, successResponse, optionsResponse } = require('./utils/api-helpers');

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  if (event.httpMethod === 'OPTIONS') {
    return optionsResponse();
  }

  // Check environment
  if (!process.env.GEMINI_KEY) {
    return errorResponse(500, 'Configuration Error', 'GEMINI_KEY not set', 'config_error');
  }

  try {
    // Use the list models endpoint - no text generation, no token limits
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_KEY}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const text = await response.text();
    
    if (!response.ok) {
      let error = 'Unknown error';
      try {
        const data = JSON.parse(text);
        error = data.error?.message || text;
      } catch {
        error = text;
      }
      
      if (response.status === 401 || response.status === 403) {
        return errorResponse(401, 'Auth Failed', 'Invalid API key', 'auth_error');
      }
      
      return errorResponse(response.status, 'API Error', error, 'api_error');
    }

    // Parse response
    const data = JSON.parse(text);
    
    // Check if our model exists
    const ourModel = data.models?.find(m => 
      m.name === 'models/gemini-2.5-pro-preview-05-06'
    );

    return successResponse({
      success: true,
      message: 'Gemini API is accessible',
      modelFound: !!ourModel,
      modelCount: data.models?.length || 0,
      ourModel: ourModel ? {
        name: ourModel.name,
        displayName: ourModel.displayName,
        supportedGenerationMethods: ourModel.supportedGenerationMethods
      } : null
    });

  } catch (error) {
    console.error('Connection test error:', error);
    return errorResponse(500, 'Connection Failed', error.message, 'connection_error');
  }
};
