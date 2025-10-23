const { getFirstCallInstruction, getRevisionInstruction } = require('./utils/tool-instructions');

const GEMINI_KEY = process.env.GEMINI_KEY;
const GEMINI_PRO_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_KEY}`;

// Simple in-memory job storage (will reset on function cold starts)
const jobs = new Map();

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Handle job status checks
  if (event.httpMethod === 'GET' && event.queryStringParameters?.jobId) {
    const jobId = event.queryStringParameters.jobId;
    const job = jobs.get(jobId);
    
    if (!job) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Job not found', status: 'not_found' })
      };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(job)
    };
  }

  // Handle new job creation
  if (event.httpMethod === 'POST') {
    try {
      const requestData = JSON.parse(event.body);
      const { step, convo, styleText, adDescriptionText, initialPromptsText } = requestData;
      
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store job as pending
      jobs.set(jobId, {
        jobId,
        status: 'pending',
        created: Date.now()
      });
      
      // Process job asynchronously after returning response
      setImmediate(async () => {
        try {
          console.log(`Processing job ${jobId}`);
          
          // Update status to processing
          jobs.set(jobId, {
            ...jobs.get(jobId),
            status: 'processing'
          });
          
          let requestBody;
          
          if (step === 1) {
            // First call - generate initial prompts
            const firstCallFixed = getFirstCallInstruction();
            const firstCallParts = [{ text: firstCallFixed }];
            
            if (styleText) {
              firstCallParts.push({ text: `[Style Block: ${styleText}]` });
            }
            if (adDescriptionText) {
              firstCallParts.push({ text: `[Ad Description: ${adDescriptionText}]` });
            }
            
            const updatedConvo = [...(convo || []), { role: 'user', parts: firstCallParts }];
            
            requestBody = {
              contents: updatedConvo,
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 4096
              }
            };
          } else if (step === 2) {
            // Second call - refinement
            const revisionInstructionText = getRevisionInstruction(initialPromptsText);
            const revisionParts = [{ text: revisionInstructionText }];
            
            if (styleText) {
              revisionParts.push({ text: `[Style Block: ${styleText}]` });
            }
            if (adDescriptionText) {
              revisionParts.push({ text: `[Ad Description: ${adDescriptionText}]` });
            }
            
            const updatedConvo = [...(convo || []), { role: 'user', parts: revisionParts }];
            
            requestBody = {
              contents: updatedConvo,
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 4096
              }
            };
          }
          
          // Make the API call
          const response = await fetch(GEMINI_PRO_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(`Gemini API error: ${response.status} ${errorData?.error?.message || response.statusText}`);
          }
          
          const result = await response.json();
          const reply = result?.candidates?.[0]?.content?.parts?.[0]?.text;
          
          if (!reply) {
            throw new Error('No response from AI service');
          }
          
          // Store successful result
          jobs.set(jobId, {
            jobId,
            status: 'completed',
            result: {
              reply,
              prompts: reply,
              convo: [...requestBody.contents, { role: 'model', parts: [{ text: reply }] }]
            },
            created: jobs.get(jobId).created,
            completed: Date.now()
          });
          
          console.log(`Job ${jobId} completed successfully`);
          
        } catch (error) {
          console.error(`Job ${jobId} failed:`, error);
          
          jobs.set(jobId, {
            jobId,
            status: 'error',
            error: error.message,
            created: jobs.get(jobId).created,
            failed: Date.now()
          });
        }
      });
      
      // Return job ID immediately
      return {
        statusCode: 202,
        headers,
        body: JSON.stringify({
          jobId,
          status: 'pending',
          message: 'Job created successfully'
        })
      };
      
    } catch (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }
  }
  
  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
}; 