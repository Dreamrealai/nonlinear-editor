const { getStore } = require('@netlify/blobs');
const { v4: uuidv4 } = require('uuid');
const { getFirstCallInstruction, getRevisionInstruction } = require('./utils/tool-instructions');
const JobStorage = require('./utils/job-storage');

const GEMINI_KEY = process.env.GEMINI_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent';

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  if (!GEMINI_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'API key not configured' })
    };
  }

  try {
    const requestData = JSON.parse(event.body);
    const { adDescription, styleBlock, step, initialPrompts } = requestData;

    // Build the prompt
    let prompt;
    let generationConfig = {
      temperature: 0.9,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
      candidateCount: 1
    };

    if (step === 'initial' || !step) {
      if (!adDescription) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Ad description is required' })
        };
      }

      const firstCallInstruction = getFirstCallInstruction();
      prompt = `
Ad Description:
${adDescription}

Style Block:
${styleBlock || 'Cinematic intimacy'}

${firstCallInstruction}`;
    } else if (step === 'refine') {
      if (!initialPrompts) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Initial prompts required for refinement' })
        };
      }
      prompt = getRevisionInstruction(initialPrompts);
      generationConfig.temperature = 0.7;
    }

    console.log('Universal handler: Starting generation...');
    
    // Try direct generation first with aggressive timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000); // 25 second timeout (leaving 1s buffer for Netlify's 26s limit)
    
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Generation failed');
      }

      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        throw new Error('No response text from generation');
      }

      // Success! Return immediately
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true,
          prompts: text,
          method: 'direct'
        })
      };

    } catch (error) {
      clearTimeout(timeout);
      
      // If it's not a timeout, throw the error
      if (error.name !== 'AbortError') {
        throw error;
      }
      
      console.log('Direct generation timed out, using existing job infrastructure...');
    }

    // If we get here, direct generation timed out
    // Use the existing gateway/check infrastructure
    
    // Generate job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Build full request data for the background job
    const fullRequestData = {
      step: step === 'refine' ? 2 : 1,
      convo: [],
      styleText: styleBlock || '',
      adDescriptionText: adDescription || '',
      initialPromptsText: initialPrompts || ''
    };
    
    // Store job using JobStorage (same as gateway)
    await JobStorage.set(jobId, {
      status: 'pending',
      data: fullRequestData,
      created: Date.now(),
      lastUpdated: Date.now(),
      step: fullRequestData.step
    }, context);
    
    console.log(`[Universal] Created job ${jobId}, attempting to trigger background processing`);
    
    // Try to trigger the background function (fire and forget)
    try {
      const backgroundUrl = `${process.env.URL || 'http://localhost:8888'}/.netlify/functions/generate-prompts-start`;
      fetch(backgroundUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Trigger-Source': 'universal',
          'X-Job-Id': jobId
        },
        body: JSON.stringify({ 
          trigger: 'immediate',
          jobId: jobId 
        })
      }).catch(err => {
        console.log('[Universal] Note: Could not trigger background function:', err.message);
      });
    } catch (error) {
      console.log('[Universal] Could not trigger background function:', error.message);
    }
    
    // Return job ID for polling
    return {
      statusCode: 202,
      headers,
      body: JSON.stringify({
        success: true,
        jobId,
        method: 'async',
        message: 'Generation is taking longer than expected. Poll for results using the jobId.'
      })
    };

  } catch (error) {
    console.error('Generate prompts error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to generate prompts',
        message: error.message 
      })
    };
  }
};