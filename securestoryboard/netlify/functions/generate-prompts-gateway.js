const JobStorage = require('./utils/job-storage');
const { 
  errorResponse, 
  successResponse, 
  optionsResponse, 
  validateEnvVars,
  parseJsonBody 
} = require('./utils/api-helpers');

// This is a regular HTTP function that triggers the background function
exports.handler = async (event, context) => {
  // Ensure function doesn't wait for event loop to be empty
  context.callbackWaitsForEmptyEventLoop = false;
  
  if (event.httpMethod === 'OPTIONS') {
    return optionsResponse();
  }

  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method not allowed', 'This endpoint only accepts POST requests', 'method_error');
  }

  try {
    validateEnvVars(['GEMINI_KEY']);
  } catch (error) {
    return errorResponse(500, 'Server configuration error', 'API key not configured.', 'configuration_error');
  }

  try {
    const requestData = parseJsonBody(event);
    if (!requestData) {
      return errorResponse(400, 'Invalid request', 'Request body is required', 'validation_error');
    }

    // Generate a robust job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[DEBUG] Creating job with ID: ${jobId}`);
    
    // Determine job type
    let jobType = 'prompts';
    if (requestData.analysisMode) {
      jobType = 'analysis';
    } else if (requestData.modificationMode) {
      jobType = 'modification';
    }
    
    // Store initial job data
    await JobStorage.set(jobId, {
      status: 'pending', // Status is 'pending' until background function picks it up
      data: requestData,
      jobType: jobType,
      created: Date.now(),
      lastUpdated: Date.now(),
      step: requestData.step || 1
    }, context);
    
    // Verify job was stored
    const verifyJob = await JobStorage.get(jobId, context);
    console.log(`[DEBUG] Job verification after storage:`, verifyJob);
    
    // Immediately trigger the background function to process this job
    // This ensures jobs get processed right away instead of waiting for a scheduled trigger
    try {
      const backgroundUrl = `${process.env.URL || 'http://localhost:8888'}/.netlify/functions/generate-prompts-start`;
      
      // Fire and forget - don't wait for the response
      fetch(backgroundUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Trigger-Source': 'gateway',
          'X-Job-Id': jobId
        },
        body: JSON.stringify({ 
          trigger: 'immediate',
          jobId: jobId 
        })
      }).catch(err => {
        console.log('[Gateway] Note: Could not trigger background function directly:', err.message);
        // This is OK - the job will still be picked up by scheduled runs or manual triggers
      });
      
      console.log(`[Gateway] Attempted to trigger background processing for job ${jobId}`);
    } catch (error) {
      // Don't fail the request if we can't trigger the background function
      console.log('[Gateway] Could not trigger background function:', error.message);
    }
    
    // Return job ID immediately
    return successResponse({ 
      jobId,
      status: 'pending',
      message: 'Prompt generation job created. Poll /generate-prompts-check with this jobId.'
    }, 202);

  } catch (error) {
    console.error('Generate prompts gateway error:', error);
    return errorResponse(
      500, 
      'Internal server error', 
      error.message || 'An unexpected error occurred', 
      'internal_error'
    );
  }
}; 