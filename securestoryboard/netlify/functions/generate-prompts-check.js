const { getStore } = require('@netlify/blobs');
const JobStorage = require('./utils/job-storage');

exports.handler = async (event, context) => {
  // Ensure function doesn't wait for event loop to be empty
  context.callbackWaitsForEmptyEventLoop = false;
  
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
    const { jobId } = event.queryStringParameters || {};
    
    if (!jobId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Job ID is required' })
      };
    }
    
    console.log(`[Check] Looking for job: ${jobId}`);
    
    // Use JobStorage to get the job (handles multiple storage strategies)
    const jobData = await JobStorage.get(jobId, context);
    
    if (!jobData) {
      console.log(`[Check] Job ${jobId} not found`);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'Job not found',
          status: 'not_found',
          jobId: jobId
        })
      };
    }
    
    console.log(`[Check] Job ${jobId} found with status: ${jobData.status}`);
    
    // Clean up completed or failed jobs after a while
    if (jobData.status === 'completed' || jobData.status === 'failed') {
      const completedAt = new Date(jobData.completedAt);
      const now = new Date();
      const ageInMinutes = (now - completedAt) / (1000 * 60);
      
      // Delete jobs older than 10 minutes
      if (ageInMinutes > 10) {
        setTimeout(() => {
          JobStorage.delete(jobId, context).catch(err => 
            console.error('Failed to delete old job:', err)
          );
        }, 1000);
      }
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(jobData)
    };
    
  } catch (error) {
    console.error('Check job error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to check job status',
        message: error.message 
      })
    };
  }
};
