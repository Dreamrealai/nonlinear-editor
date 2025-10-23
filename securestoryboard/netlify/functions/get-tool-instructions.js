const { getToolInstructions } = require('./utils/tool-instructions');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
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