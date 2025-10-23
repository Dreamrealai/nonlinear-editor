const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const { getCorsHeaders } = require('../../lib/cors');

// Simple JWT secret - in production, use a proper secret
const JWT_SECRET = process.env.JWT_SECRET || 'storyboard-secret-2024';

exports.handler = async (event, context) => {
  // Enable CORS with proper origin validation
  const headers = {
    ...getCorsHeaders(event, {
      allowCredentials: true,
      allowedMethods: 'POST, OPTIONS',
      allowedHeaders: 'Content-Type'
    }),
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { password } = JSON.parse(event.body);
    
    if (password !== process.env.AUTH_PASSWORD) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid password' })
      };
    }

    // Create JWT token
    const token = jwt.sign(
      { authenticated: true, timestamp: Date.now() },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set cookie
    const authCookie = cookie.serialize('auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 86400, // 24 hours
      path: '/'
    });

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Set-Cookie': authCookie
      },
      body: JSON.stringify({ success: true, token })
    };
  } catch (error) {
    console.error('Auth error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Authentication failed' })
    };
  }
};
