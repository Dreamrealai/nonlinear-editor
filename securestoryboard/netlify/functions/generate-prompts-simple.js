const { getToolInstructions, getFirstCallInstruction, getRevisionInstruction } = require('./utils/tool-instructions');

const GEMINI_KEY = process.env.GEMINI_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent';

exports.handler = async (event, context) => {
  // Ensure function doesn't wait for event loop
  context.callbackWaitsForEmptyEventLoop = false;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
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
    const { step } = requestData;

    // Handle split approach
    if (step === 'initial') {
      return await handleInitialGeneration(requestData, headers);
    } else if (step === 'refine') {
      return await handleRefinement(requestData, headers);
    } else {
      // Legacy single-call approach (not recommended)
      return await handleLegacyApproach(requestData, headers);
    }

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

async function handleInitialGeneration(requestData, headers) {
  const { adDescription, styleBlock } = requestData;
  
  if (!adDescription) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Ad description is required' })
    };
  }

  // Check input size to prevent token limit issues
  const totalInputLength = adDescription.length + (styleBlock || '').length;
  if (totalInputLength > 10000) { // ~2500 tokens roughly
    console.log(`Input too large: ${totalInputLength} characters`);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Input too large',
        message: 'Your ad description is too long. Please try with a shorter description (under 10,000 characters total).'
      })
    };
  }

  const firstCallInstruction = getFirstCallInstruction();
  const initialPrompt = `
Ad Description:
${adDescription}

Style Block:
${styleBlock || 'Cinematic intimacy'}

${firstCallInstruction}`;

  console.log('Generating initial prompts...');
  console.log('Input length - Ad Description:', adDescription.length, 'Style:', (styleBlock || '').length);
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 22000); // 22 second timeout (leaving 4s buffer for Netlify's 26s limit)
  
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
          maxOutputTokens: 8192,
          candidateCount: 1  // Only generate one candidate to save time
        }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Initial generation failed');
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('No response text from initial generation');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        prompts: text 
      })
    };
  } catch (fetchError) {
    if (fetchError.name === 'AbortError') {
      return {
        statusCode: 504,
        headers,
        body: JSON.stringify({ 
          error: 'Request timeout',
          message: 'Initial generation took too long. Please try with a shorter brief.'
        })
      };
    }
    throw fetchError;
  } finally {
    clearTimeout(timeout);
  }
}

async function handleRefinement(requestData, headers) {
  const { initialPrompts } = requestData;
  
  if (!initialPrompts) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Initial prompts are required for refinement' })
    };
  }

  console.log('Refining prompts...');
  const revisionPrompt = getRevisionInstruction(initialPrompts);
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000); // 20 second timeout for Netlify
  
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
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      // Return initial prompts if refinement fails
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true,
          prompts: initialPrompts,
          warning: 'Refinement encountered an error, using initial prompts' 
        })
      };
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || initialPrompts;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        prompts: text 
      })
    };
  } catch (fetchError) {
    if (fetchError.name === 'AbortError') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true,
          prompts: initialPrompts,
          warning: 'Refinement step timed out, using initial prompts' 
        })
      };
    }
    // For other errors, still return initial prompts
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        prompts: initialPrompts,
        warning: 'Refinement encountered an issue, using initial prompts' 
      })
    };
  } finally {
    clearTimeout(timeout);
  }
}

// Legacy approach - tries to do both in one call (not recommended due to timeouts)
async function handleLegacyApproach(requestData, headers) {
  const { adDescription, styleBlock } = requestData;
  
  if (!adDescription) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Ad description is required' })
    };
  }

  // For legacy, just do initial generation and skip refinement
  return await handleInitialGeneration(requestData, headers);
} 