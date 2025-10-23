const { getStore } = require('@netlify/blobs');
const { getCorsHeaders } = require('../../lib/cors');

const { getFirstCallInstruction, getRevisionInstruction } = require('./utils/tool-instructions');

const GEMINI_KEY = process.env.GEMINI_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent';

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

  const store = getStore('prompt-jobs');

  try {
    const { jobId } = JSON.parse(event.body);
    
    if (!jobId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Job ID required' })
      };
    }
    
    // Get job data
    const jobDataStr = await store.get(jobId);
    if (!jobDataStr) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Job not found' })
      };
    }
    
    const jobData = JSON.parse(jobDataStr);
    const { request } = jobData;
    
    // Update status to processing
    jobData.status = 'processing';
    jobData.updatedAt = new Date().toISOString();
    await store.set(jobId, JSON.stringify(jobData));
    
    try {
      // Process the request
      const { adDescription, styleBlock, step, initialPrompts } = request;
      let result;
      
      if (step === 'initial' || !step) {
        if (!adDescription) {
          throw new Error('Ad description is required');
        }

        const totalInputLength = adDescription.length + (styleBlock || '').length;
        if (totalInputLength > 50000) {
          throw new Error('Input too large. Please reduce your ad description to under 50,000 characters total.');
        }

        const firstCallInstruction = getFirstCallInstruction();
        const initialPrompt = `
Ad Description:
${adDescription}

Style Block:
${styleBlock || 'Cinematic intimacy'}

${firstCallInstruction}`;

        console.log('Webhook: Generating initial prompts...');
        console.log('Input length - Ad Description:', adDescription.length, 'Style:', (styleBlock || '').length);
        
        // No timeout on webhook function - it can run longer
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
        if (!initialPrompts) {
          throw new Error('Initial prompts are required for refinement');
        }

        console.log('Webhook: Refining prompts...');
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
      
      // Update job with success
      jobData.status = 'completed';
      jobData.result = result;
      jobData.completedAt = new Date().toISOString();
      await store.set(jobId, JSON.stringify(jobData));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true,
          jobId,
          message: 'Job completed successfully'
        })
      };
      
    } catch (processError) {
      console.error('Job processing error:', processError);
      
      // Update job with failure
      jobData.status = 'failed';
      jobData.error = processError.message;
      jobData.completedAt = new Date().toISOString();
      await store.set(jobId, JSON.stringify(jobData));
      
      return {
        statusCode: 200, // Still return 200 so webhook doesn't retry
        headers,
        body: JSON.stringify({ 
          success: false,
          jobId,
          error: processError.message
        })
      };
    }
    
  } catch (error) {
    console.error('Webhook handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Webhook processing failed',
        message: error.message 
      })
    };
  }
};
