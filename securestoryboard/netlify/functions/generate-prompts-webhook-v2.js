const { getStore } = require('@netlify/blobs');
const { getCorsHeaders } = require('../../lib/cors');

const { v4: uuidv4 } = require('uuid');

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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const requestData = JSON.parse(event.body);
    const jobId = uuidv4();
    const store = getStore('prompt-jobs');
    
    // Store job data with request
    const jobData = {
      id: jobId,
      status: 'pending',
      request: requestData,
      createdAt: new Date().toISOString()
    };
    
    await store.set(jobId, JSON.stringify(jobData));
    
    // Get the webhook URL from environment or construct it
    const PROMPT_WEBHOOK_URL = process.env.PROMPT_WEBHOOK_URL || 
      `${process.env.URL || event.headers.origin}/.netlify/functions/process-prompt-webhook-v2`;
    
    // Trigger webhook asynchronously
    fetch(PROMPT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId })
    }).catch(err => {
      console.error('Failed to trigger webhook:', err);
      // Don't fail the request, the client can still poll
    });
    
    // Return immediately with job ID
    return {
      statusCode: 202,
      headers,
      body: JSON.stringify({
        jobId,
        message: 'Job created. Poll /generate-prompts-check with this jobId for results.'
      })
    };
    
  } catch (error) {
    console.error('Error creating job:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to create job',
        message: error.message 
      })
    };
  }
};
