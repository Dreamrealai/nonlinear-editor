const { schedule } = require('@netlify/functions');

// This scheduled function runs every minute to process pending jobs
exports.handler = schedule('* * * * *', async (event, context) => {
  console.log('[Scheduled] Checking for pending prompt generation jobs...');
  
  try {
    // Trigger the background function by making an internal call
    // In production, you'd want to use Netlify's internal function invocation
    // For now, we'll use a simple HTTP request to the gateway to check for pending jobs
    
    const backgroundFunctionUrl = `${process.env.URL}/.netlify/functions/generate-prompts-start`;
    
    // The background function will check for pending jobs when invoked
    const response = await fetch(backgroundFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Scheduled-Trigger': 'true'
      },
      body: JSON.stringify({ trigger: 'scheduled' })
    });
    
    console.log('[Scheduled] Background function triggered, status:', response.status);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Job processor triggered' })
    };
    
  } catch (error) {
    console.error('[Scheduled] Error triggering background function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}); 