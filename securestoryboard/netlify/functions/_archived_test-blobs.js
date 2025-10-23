// Test function to verify Netlify Blobs is working

const { getStore } = require('@netlify/blobs');
const { getCorsHeaders } = require('../../lib/cors');

exports.handler = async (event, context) => {
  console.log('Testing Netlify Blobs connection...');
  console.log('Context:', JSON.stringify(context, null, 2));
  console.log('Environment:', {
    SITE_ID: process.env.SITE_ID,
    NETLIFY_SITE_ID: process.env.NETLIFY_SITE_ID,
    DEPLOY_ID: process.env.DEPLOY_ID,
    CONTEXT: process.env.CONTEXT
  });

  try {
    // Try to create a store
    const testStore = getStore({
      name: 'test-store',
      consistency: 'strong'
    });
    
    // Try to write and read
    const testKey = 'test-' + Date.now();
    const testData = { message: 'Blobs is working!', timestamp: new Date().toISOString() };
    
    await testStore.set(testKey, testData);
    const result = await testStore.get(testKey);
    await testStore.delete(testKey);

    return {
      statusCode: 200,
      headers: {
        ...getCorsHeaders(event, {
          allowCredentials: true,
          allowedMethods: 'GET, OPTIONS',
          allowedHeaders: 'Content-Type'
        }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Netlify Blobs is working correctly!',
        testData: result,
        environment: {
          siteId: context?.site?.id || process.env.NETLIFY_SITE_ID || 'not found',
          hasBlobsModule: true
        }
      })
    };
  } catch (error) {
    console.error('Blobs test error:', error);
    return {
      statusCode: 200,
      headers: {
        ...getCorsHeaders(event, {
          allowCredentials: true,
          allowedMethods: 'GET, OPTIONS',
          allowedHeaders: 'Content-Type'
        }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
        environment: {
          siteId: context?.site?.id || process.env.NETLIFY_SITE_ID || 'not found',
          context: process.env.CONTEXT
        }
      })
    };
  }
};
