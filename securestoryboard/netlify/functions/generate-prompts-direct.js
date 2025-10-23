const { getFirstCallInstruction, getRevisionInstruction } = require('./utils/tool-instructions');
const { 
  errorResponse, 
  successResponse, 
  optionsResponse, 
  validateEnvVars,
  parseJsonBody 
} = require('./utils/api-helpers');
const { determineMimeType } = require('./utils/mime-types');

const GEMINI_KEY = process.env.GEMINI_KEY;

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

    const { convo, styleFile, styleText, adDescriptionFile, adDescriptionText } = requestData;
    
    // Step 1: Generate initial prompts
    console.log('[Direct] Starting Step 1: Initial prompt generation');
    const step1Result = await generateInitialPrompts(convo, styleFile, styleText, adDescriptionFile, adDescriptionText);
    
    // Send a status update (though we can't actually send this mid-request in a single function call)
    // The client will handle the messaging timing
    
    // Step 2: Refine prompts
    console.log('[Direct] Starting Step 2: Prompt refinement');
    const step2Result = await refinePrompts(
      step1Result.reply, 
      step1Result.convo, 
      styleFile, 
      styleText, 
      adDescriptionFile, 
      adDescriptionText
    );
    
    // Return the final result
    return successResponse({
      reply: step2Result.reply,
      scenes: step2Result.scenes,
      convo: step2Result.convo,
      status: 'completed'
    });

  } catch (error) {
    console.error('Generate prompts error:', error);
    
    // Handle timeout errors specifically
    if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
      return errorResponse(
        504, 
        'Request timeout', 
        'The AI service took too long to respond. Please try again with a simpler brief.', 
        'timeout_error'
      );
    }
    
    return errorResponse(
      500, 
      'Internal server error', 
      error.message || 'An unexpected error occurred', 
      'internal_error'
    );
  }
};

async function generateInitialPrompts(convo, styleFile, styleText, adDescriptionFile, adDescriptionText) {
  const GEMINI_PRO_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_KEY}`;
  
  // Build the request
  const firstCallFixed = getFirstCallInstruction();
  const firstCallParts = [{ text: firstCallFixed }];
  
  if (styleFile) {
    firstCallParts.push({
      inlineData: {
        mimeType: determineMimeType(styleFile),
        data: styleFile.data
      }
    });
  }
  if (styleText) {
    firstCallParts.push({ text: `[Style Block: ${styleText}]` });
  }
  if (adDescriptionFile) {
    firstCallParts.push({
      inlineData: {
        mimeType: determineMimeType(adDescriptionFile),
        data: adDescriptionFile.data
      }
    });
  }
  if (adDescriptionText) {
    firstCallParts.push({ text: `[Ad Description: ${adDescriptionText}]` });
  }

  const updatedConvo = [...convo, { role: 'user', parts: firstCallParts }];
  
  const requestBody = {
    contents: updatedConvo,
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
      candidateCount: 1
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_NONE"
      }
    ]
  };

  // Make the API call with a timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000); // 25 second timeout
  
  let response;
  try {
    response = await fetch(GEMINI_PRO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Initial prompt generation timed out after 25 seconds');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(`Gemini API error: ${response.status} ${errorData?.error?.message || response.statusText}`);
  }

  const result = await response.json();
  const reply = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!reply) {
    throw new Error('No response from AI service for initial prompts');
  }

  return {
    reply,
    convo: [...updatedConvo, { role: 'model', parts: [{ text: reply }] }]
  };
}

async function refinePrompts(initialPromptsText, convo, styleFile, styleText, adDescriptionFile, adDescriptionText) {
  const GEMINI_PRO_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_KEY}`;
  
  // Build the refinement request
  const revisionInstructionText = getRevisionInstruction(initialPromptsText);
  const revisionParts = [{ text: revisionInstructionText }];
  
  if (styleFile && styleFile.data) {
    revisionParts.push({
      inlineData: {
        mimeType: determineMimeType(styleFile),
        data: styleFile.data
      }
    });
  }
  if (styleText) {
    revisionParts.push({ text: `[Style Block: ${styleText}]` });
  }
  if (adDescriptionFile && adDescriptionFile.data) {
    revisionParts.push({
      inlineData: {
        mimeType: determineMimeType(adDescriptionFile),
        data: adDescriptionFile.data
      }
    });
  }
  if (adDescriptionText) {
    revisionParts.push({ text: `[Ad Description: ${adDescriptionText}]` });
  }

  const updatedConvo = [...convo, { role: 'user', parts: revisionParts }];
  
  const requestBody = {
    contents: updatedConvo,
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
      candidateCount: 1
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_NONE"
      }
    ]
  };

  // Make the API call with a timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000); // 25 second timeout
  
  let response;
  try {
    response = await fetch(GEMINI_PRO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Prompt refinement timed out after 25 seconds');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(`Gemini API error: ${response.status} ${errorData?.error?.message || response.statusText}`);
  }

  const result = await response.json();
  const reply = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!reply) {
    throw new Error('No response from AI service for refined prompts');
  }

  // Parse scenes from the reply
  const scenes = {};
  const lines = reply.split(/\r?\n/);
  let currentScene = 0;
  let buffer = [];
  
  const flush = () => {
    if (currentScene && currentScene <= 16) {
      scenes[currentScene] = buffer.join(' ').trim();
    }
    buffer = [];
  };

  for (const line of lines) {
    const match = line.match(/^Scene\s*(\d+)\s*[:\-]\s*(.*)$/i);
    if (match) {
      flush();
      currentScene = parseInt(match[1]);
      buffer.push(match[2]);
    } else if (currentScene && line.trim()) {
      buffer.push(line.trim());
    }
  }
  flush();

  return {
    reply,
    scenes,
    convo: [...updatedConvo, { role: 'model', parts: [{ text: reply }] }]
  };
} 