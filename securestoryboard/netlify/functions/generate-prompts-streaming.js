const { getFirstCallInstruction, getRevisionInstruction } = require('./utils/tool-instructions');
const { getCorsHeaders } = require('../../lib/cors');


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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const GEMINI_KEY = process.env.GEMINI_KEY;
  const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:streamGenerateContent';

  try {
    const requestData = JSON.parse(event.body);
    const { adDescription, styleBlock, step, initialPrompts } = requestData;

    let prompt;
    let generationConfig = {
      temperature: 0.9,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192
    };

    if (step === 'initial' || !step) {
      if (!adDescription) {
        return {
          statusCode: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
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
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Initial prompts required for refinement' })
        };
      }
      prompt = getRevisionInstruction(initialPrompts);
      generationConfig.temperature = 0.7;
    }

    // Use streaming API
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        statusCode: 502,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'AI service error',
          message: error.error?.message || 'Generation failed'
        })
      };
    }

    // Stream the response
    let fullText = '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
              fullText += data.candidates[0].content.parts[0].text;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }

    // Return the complete response
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompts: fullText })
    };

  } catch (error) {
    console.error('Streaming error:', error);
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};
