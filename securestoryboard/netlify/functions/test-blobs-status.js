const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
    // Test 1: Create stores
    const testStore = getStore('test-store');
    const promptStore = getStore('prompt-jobs');
    
    // Test 2: Write test data
    const testKey = `test-${Date.now()}`;
    const testData = {
      message: 'Netlify Blobs is working in production!',
      timestamp: new Date().toISOString(),
      environment: 'production',
      functionName: context.functionName
    };
    
    await testStore.set(testKey, JSON.stringify(testData));
    
    // Test 3: Read the data back
    const retrievedData = await testStore.get(testKey);
    const parsed = JSON.parse(retrievedData);
    
    // Test 4: List keys in both stores
    const testKeys = [];
    for await (const key of testStore.list()) {
      testKeys.push(key);
      if (testKeys.length >= 5) break; // Limit to 5 keys
    }
    
    const jobKeys = [];
    for await (const key of promptStore.list()) {
      jobKeys.push(key);
      if (jobKeys.length >= 5) break; // Limit to 5 keys
    }
    
    // Test 5: Clean up
    await testStore.delete(testKey);
    
    // Return results
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Netlify Blobs is working correctly!',
        tests: {
          write: '✅ Successfully wrote data',
          read: '✅ Successfully read data',
          data: parsed,
          cleanup: '✅ Successfully deleted test data'
        },
        stores: {
          testStore: {
            name: 'test-store',
            keyCount: testKeys.length,
            sampleKeys: testKeys
          },
          promptJobsStore: {
            name: 'prompt-jobs',
            keyCount: jobKeys.length,
            sampleKeys: jobKeys
          }
        },
        environment: {
          region: process.env.AWS_REGION || 'unknown',
          functionName: context.functionName,
          nodeVersion: process.version
        }
      }, null, 2)
    };
    
  } catch (error) {
    console.error('Blobs test error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
        hint: 'Check if Netlify Blobs is enabled for your site in the Netlify dashboard'
      }, null, 2)
    };
  }
};
