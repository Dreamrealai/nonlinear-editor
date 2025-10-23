const { getToolInstructions } = require('./utils/tool-instructions');
const { getCorsHeaders } = require('../../lib/cors');


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

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const instructions = getToolInstructions();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ instructions })
    };

  } catch (error) {
    console.error('Get tool instructions error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to retrieve tool instructions' })
    };
  }
}; 