const { getStore } = require('@netlify/blobs');
const { v4: uuidv4 } = require('uuid');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const store = getStore('prompt-jobs');

  // GET request - check job status
  if (event.httpMethod === 'GET') {
    const jobId = event.queryStringParameters?.jobId;
    if (!jobId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Job ID required' })
      };
    }

    try {
      const job = await store.get(jobId);
      if (!job) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Job not found' })
        };
      }

      const jobData = JSON.parse(job);
      
      // Clean up completed or failed jobs after returning them
      if (jobData.status === 'completed' || jobData.status === 'failed') {
        // Don't delete immediately - give client time to retry if needed
        setTimeout(() => store.delete(jobId), 60000); // Delete after 1 minute
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(jobData)
      };
    } catch (error) {
      console.error('Error checking job:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to check job status' })
      };
    }
  }

  // POST request - start new job
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
    
    // Store initial job state
    await store.set(jobId, JSON.stringify({
      status: 'pending',
      createdAt: new Date().toISOString()
    }));

    // Start the async job
    startAsyncJob(jobId, requestData, store).catch(error => {
      console.error('Async job error:', error);
      // Update job status to failed
      store.set(jobId, JSON.stringify({
        status: 'failed',
        error: error.message,
        completedAt: new Date().toISOString()
      }));
    });

    // Return immediately with job ID
    return {
      statusCode: 202, // Accepted
      headers,
      body: JSON.stringify({
        jobId,
        status: 'pending',
        message: 'Job started. Poll the status endpoint to check progress.'
      })
    };

  } catch (error) {
    console.error('Error starting job:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to start job',
        message: error.message 
      })
    };
  }
};

async function startAsyncJob(jobId, requestData, store) {
  const { getFirstCallInstruction, getRevisionInstruction } = require('./utils/tool-instructions');
  const GEMINI_KEY = process.env.GEMINI_KEY;
  const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent';

  const { adDescription, styleBlock, step, initialPrompts } = requestData;

  try {
    // Update status to processing
    await store.set(jobId, JSON.stringify({
      status: 'processing',
      step: step || 'initial',
      updatedAt: new Date().toISOString()
    }));

    let result;
    
    if (step === 'initial' || !step) {
      // Initial generation
      if (!adDescription) {
        throw new Error('Ad description is required');
      }

      const totalInputLength = adDescription.length + (styleBlock || '').length;
      if (totalInputLength > 10000) {
        throw new Error('Your ad description is too long. Please try with a shorter description (under 10,000 characters total).');
      }

      const firstCallInstruction = getFirstCallInstruction();
      const initialPrompt = `
Ad Description:
${adDescription}

Style Block:
${styleBlock || 'Cinematic intimacy'}

${firstCallInstruction}`;

      console.log('Generating initial prompts in background...');
      console.log('Input length - Ad Description:', adDescription.length, 'Style:', (styleBlock || '').length);

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: initialPrompt }] }],
          generationConfig: {
            temperature: 0.9,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Initial generation failed');
      }

      const apiResult = await response.json();
      const text = apiResult.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        throw new Error('No response text from initial generation');
      }

      result = { prompts: text };

    } else if (step === 'refine') {
      // Refinement step
      if (!initialPrompts) {
        throw new Error('Initial prompts are required for refinement');
      }

      console.log('Refining prompts in background...');
      const revisionPrompt = getRevisionInstruction(initialPrompts);

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: revisionPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192
          }
        })
      });

      if (!response.ok) {
        // Return initial prompts if refinement fails
        result = { 
          prompts: initialPrompts,
          warning: 'Refinement encountered an error, using initial prompts'
        };
      } else {
        const apiResult = await response.json();
        const text = apiResult.candidates?.[0]?.content?.parts?.[0]?.text || initialPrompts;
        result = { prompts: text };
      }
    }

    // Update job with completed status
    await store.set(jobId, JSON.stringify({
      status: 'completed',
      result,
      completedAt: new Date().toISOString()
    }));

  } catch (error) {
    console.error('Job processing error:', error);
    await store.set(jobId, JSON.stringify({
      status: 'failed',
      error: error.message,
      completedAt: new Date().toISOString()
    }));
  }
}
