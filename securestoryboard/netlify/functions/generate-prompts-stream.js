const { getToolInstructions, getFirstCallInstruction, getRevisionInstruction } = require('./utils/tool-instructions');
const { getCorsHeaders } = require('../../lib/cors');


const GEMINI_KEY = process.env.GEMINI_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

exports.handler = async (event, context) => {
  const corsHeaders = getCorsHeaders(event, {
    allowCredentials: true,
    allowedMethods: 'POST, OPTIONS',
    allowedHeaders: 'Content-Type'
  });

  const headers = {
    ...corsHeaders,
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: '' };
  }

  if (!GEMINI_KEY) {
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'API key not configured' })
    };
  }

  try {
    const requestData = JSON.parse(event.body);
    const { step } = requestData;

    // Return a streaming response
    return {
      statusCode: 200,
      headers,
      body: await generateStreamingResponse(requestData, step),
      isBase64Encoded: false
    };

  } catch (error) {
    console.error('Generate prompts error:', error);
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Failed to generate prompts',
        message: error.message 
      })
    };
  }
};

async function generateStreamingResponse(requestData, step) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial heartbeat
        controller.enqueue(encoder.encode('data: {"status":"starting"}\n\n'));

        if (step === 'initial') {
          await streamInitialGeneration(requestData, controller, encoder);
        } else if (step === 'refine') {
          await streamRefinement(requestData, controller, encoder);
        } else {
          await streamInitialGeneration(requestData, controller, encoder);
        }

        // Send completion
        controller.enqueue(encoder.encode('data: {"status":"complete"}\n\n'));
        controller.close();
      } catch (error) {
        controller.enqueue(encoder.encode(`data: {"error":"${error.message}"}\n\n`));
        controller.close();
      }
    }
  });

  // Convert stream to string for Netlify
  const reader = stream.getReader();
  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += new TextDecoder().decode(value);
  }
  return result;
}

async function streamInitialGeneration(requestData, controller, encoder) {
  const { adDescription, styleBlock } = requestData;
  
  if (!adDescription) {
    throw new Error('Ad description is required');
  }

  // Check input size
  const totalInputLength = adDescription.length + (styleBlock || '').length;
  if (totalInputLength > 10000) {
    throw new Error('Your ad description is too long. Please try with a shorter description (under 10,000 characters total).');
  }

  // Send heartbeat
  controller.enqueue(encoder.encode('data: {"status":"generating","message":"Analyzing your brief..."}\n\n'));

  const firstCallInstruction = getFirstCallInstruction();
  const initialPrompt = `
Ad Description:
${adDescription}

Style Block:
${styleBlock || 'Cinematic intimacy'}

${firstCallInstruction}`;

  console.log('Generating initial prompts...');
  console.log('Input length - Ad Description:', adDescription.length, 'Style:', (styleBlock || '').length);
  
  // Set up heartbeat interval to keep connection alive
  const heartbeatInterval = setInterval(() => {
    controller.enqueue(encoder.encode('data: {"status":"processing","message":"Still working on your prompts..."}\n\n'));
  }, 5000); // Send heartbeat every 5 seconds

  try {
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

    clearInterval(heartbeatInterval);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Initial generation failed');
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('No response text from initial generation');
    }

    // Send the result
    controller.enqueue(encoder.encode(`data: {"status":"success","prompts":${JSON.stringify(text)}}\n\n`));

  } catch (error) {
    clearInterval(heartbeatInterval);
    throw error;
  }
}

async function streamRefinement(requestData, controller, encoder) {
  const { initialPrompts } = requestData;
  
  if (!initialPrompts) {
    throw new Error('Initial prompts are required for refinement');
  }

  // Send heartbeat
  controller.enqueue(encoder.encode('data: {"status":"refining","message":"Refining your prompts..."}\n\n'));

  console.log('Refining prompts...');
  const revisionPrompt = getRevisionInstruction(initialPrompts);
  
  // Set up heartbeat interval
  const heartbeatInterval = setInterval(() => {
    controller.enqueue(encoder.encode('data: {"status":"processing","message":"Almost done..."}\n\n'));
  }, 5000);

  try {
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

    clearInterval(heartbeatInterval);

    if (!response.ok) {
      // Return initial prompts if refinement fails
      controller.enqueue(encoder.encode(`data: {"status":"success","prompts":${JSON.stringify(initialPrompts)},"warning":"Refinement encountered an error, using initial prompts"}\n\n`));
      return;
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || initialPrompts;

    controller.enqueue(encoder.encode(`data: {"status":"success","prompts":${JSON.stringify(text)}}\n\n`));

  } catch (error) {
    clearInterval(heartbeatInterval);
    // Return initial prompts on error
    controller.enqueue(encoder.encode(`data: {"status":"success","prompts":${JSON.stringify(initialPrompts)},"warning":"Refinement failed, using initial prompts"}\n\n`));
  }
}
