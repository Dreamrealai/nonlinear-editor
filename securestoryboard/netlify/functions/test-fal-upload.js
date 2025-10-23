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
    return errorResponse(500, 'Server configuration error', 'FAL service not configured.', 'configuration_error');
  }

  try {
    const requestData = parseJsonBody(event);
    if (!requestData || !requestData.imageData) {
      return errorResponse(400, 'Invalid request', 'Image data is required', 'validation_error');
    }

    const { imageData } = requestData;
    
    // Test different upload approaches
    const results = {
      uploadTests: []
    };

    // Test 1: Direct storage upload
    try {
      const blob = Buffer.from(imageData, 'base64');
      console.log('Test 1: Direct upload, blob size:', blob.length);
      
      const uploadResponse = await fetch('https://fal.run/storage/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
          'Content-Type': 'image/jpeg'
        },
        body: blob
      });

      const uploadResult = await uploadResponse.text();
      results.uploadTests.push({
        test: 'Direct storage upload',
        status: uploadResponse.status,
        headers: Object.fromEntries(uploadResponse.headers.entries()),
        response: uploadResult.substring(0, 500)
      });
    } catch (error) {
      results.uploadTests.push({
        test: 'Direct storage upload',
        error: error.message
      });
    }

    // Test 2: Check if we can use data URLs directly
    try {
      const dataUrl = `data:image/jpeg;base64,${imageData}`;
      const testResponse = await fetch('https://fal.run/fal-ai/flux-pro/kontext', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'test',
          image_url: dataUrl,
          guidance_scale: 3.5,
          num_images: 1,
          sync_mode: false
        })
      });

      const testResult = await testResponse.text();
      results.uploadTests.push({
        test: 'Data URL direct to Kontext',
        status: testResponse.status,
        response: testResult.substring(0, 500)
      });
    } catch (error) {
      results.uploadTests.push({
        test: 'Data URL direct to Kontext',
        error: error.message
      });
    }

    return successResponse(results);

  } catch (error) {
    console.error('Test error:', error);
    return errorResponse(500, 'Test failed', error.message, 'test_error');
  }
};
