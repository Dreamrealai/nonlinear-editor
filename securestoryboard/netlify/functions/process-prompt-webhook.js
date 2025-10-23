const { getStore } = require('@netlify/blobs');

// This function processes jobs triggered by webhook
exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { jobId } = JSON.parse(event.body);
    if (!jobId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Job ID required' })
      };
    }

    const store = getStore('prompt-jobs');
    
    // Get job data
    const jobDataRaw = await store.get(jobId);
    if (!jobDataRaw) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Job not found' })
      };
    }

    const jobData = JSON.parse(jobDataRaw);
    if (jobData.status !== 'pending') {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Job already processed' })
      };
    }

    // Process the job
    await processJob(jobId, jobData.requestData, store);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };

  } catch (error) {
    console.error('Webhook processing error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

async function processJob(jobId, requestData, store) {
  const { getFirstCallInstruction, getRevisionInstruction } = require('./utils/tool-instructions');
  const GEMINI_KEY = process.env.GEMINI_KEY;
  const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent';

  const { adDescription, styleBlock, step, initialPrompts } = requestData;

  try {
    // Update status to processing
    await store.set(jobId, JSON.stringify({
      status: 'processing',
      step: step || 'initial',
      updatedAt: new Date().toISOString(),
      requestData: requestData
    }));

    let result;
    
    if (step === 'initial' || !step) {
      // Initial generation
      if (!adDescription) {
        throw new Error('Ad description is required');
      }

      const firstCallInstruction = getFirstCallInstruction();
      const initialPrompt = `
Ad Description:
${adDescription}

Style Block:
${styleBlock || 'Cinematic intimacy'}

${firstCallInstruction}`;

      console.log('Webhook: Generating initial prompts...');

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
