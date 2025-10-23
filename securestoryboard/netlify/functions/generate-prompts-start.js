// This needs to be a background function to handle long-running Gemini requests
exports.config = {
  type: "background"
};

const { getFirstCallInstruction, getRevisionInstruction } = require('./utils/tool-instructions');
const { getCorsHeaders } = require('../../lib/cors');

const JobStorage = require('./utils/job-storage');
const { 
  errorResponse, 
  successResponse, 
  optionsResponse, 
  validateEnvVars,
  parseJsonBody 
} = require('./utils/api-helpers');
const { determineMimeType } = require('./utils/mime-types');

const GEMINI_KEY = process.env.GEMINI_KEY;

// This function can work as both a background function and a regular HTTP function
const isBackground = exports.config && exports.config.type === "background";

// Main handler that can work in both modes
exports.handler = async (event, context) => {
  // Ensure function doesn't wait for event loop to be empty
  context.callbackWaitsForEmptyEventLoop = false;
  
  console.log('Generate prompts start function triggered, isBackground:', isBackground);
  
  // If called via HTTP (not as background), return immediately and process in background
  if (!isBackground && event.httpMethod) {
    // For HTTP calls, just acknowledge and return
    console.log('HTTP trigger received, processing will continue in background');
    
    // Start processing without waiting
    processJobs(context).catch(err => {
      console.error('Error processing jobs:', err);
    });
    
    return {
      statusCode: 202,
      headers: {
        ...getCorsHeaders(event, {
          allowCredentials: true,
          allowedMethods: 'POST, OPTIONS',
          allowedHeaders: 'Content-Type'
        }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'Job processing started' })
    };
  }
  
  // For background mode, process jobs synchronously
  await processJobs(context);
};

async function processJobs(context) {
  console.log('Starting job processing...');
  
  try {
    // Validate environment
    if (!GEMINI_KEY) {
      console.error('GEMINI_KEY not configured');
      return;
    }
    
    // Get all jobs from storage
    const allJobs = await JobStorage.getAllJobs(context);
    console.log(`Found ${Object.keys(allJobs).length} total jobs`);
    
    // Filter for pending jobs
    const pendingJobs = Object.entries(allJobs)
      .filter(([id, job]) => job.status === 'pending')
      .sort((a, b) => a[1].created - b[1].created); // Process oldest first
    
    console.log(`Found ${pendingJobs.length} pending jobs`);
    
    // Process each pending job
    for (const [jobId, job] of pendingJobs) {
      console.log(`Processing pending job: ${jobId}`);
      
      try {
        // Update status to processing
        await JobStorage.set(jobId, {
          ...job,
          status: 'processing',
          lastUpdated: Date.now(),
          message: 'Job picked up by background worker'
        }, context);
        
        // Process the job
        await processPrompts(jobId, job.data, context);
        console.log(`Job ${jobId} completed successfully`);
        
      } catch (error) {
        console.error(`Job ${jobId} failed:`, error);
        // Error is already handled in processPrompts
      }
    }
    
    // Clean up old jobs
    await JobStorage.cleanup(context);
    
  } catch (error) {
    console.error('Background function error:', error);
  }
  
  console.log('Background function completed');
}

async function processPrompts(jobId, requestData, context) {
  const GEMINI_PRO_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_KEY}`;
  
  try {
    // Update job status to indicate active processing
    await JobStorage.set(jobId, {
      status: 'processing',
      data: requestData,
      created: Date.now(),
      lastUpdated: Date.now(),
      message: 'Calling AI service...'
    }, context);
    
    console.log(`Processing job ${jobId} with step ${requestData.step}`);

    // Capture the original requestData at the top of processPrompts to ensure we have the true original.
    const originalFullRequestData = { ...requestData };

    const { step, convo, styleFile, styleText, adDescriptionFile, adDescriptionText, initialPromptsText } = requestData;

    let requestBody;
    
    // Handle different job types
    if (requestData.analysisMode || requestData.modificationMode) {
      // Simple text-only analysis or modification request
      requestBody = {
        contents: [{
          role: 'user',
          parts: [{ text: requestData.prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
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
    } else if (step === 1) {
      // First call - generate initial prompts
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
      
      requestBody = {
        contents: updatedConvo,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
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
      
    } else if (step === 2) {
      // Second call - refinement
      const revisionInstructionText = getRevisionInstruction(initialPromptsText);
      const revisionParts = [{ text: revisionInstructionText }];
      
      // For step 2, styleFile, styleText, adDescriptionFile, adDescriptionText should be part of the requestData
      // sent by the client, originally sourced from originalRequestData of step 1.
      if (styleFile && styleFile.data) {
        revisionParts.push({
          inlineData: {
            mimeType: determineMimeType(styleFile),
            data: styleFile.data
          }
        });
      }
      if (styleText) { // Add styleText if present
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
      if (adDescriptionText) { // Add adDescriptionText if present
        revisionParts.push({ text: `[Ad Description: ${adDescriptionText}]` });
      }

      const updatedConvo = [...convo, { role: 'user', parts: revisionParts }];
      
      requestBody = {
        contents: updatedConvo,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
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
    }

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
        throw new Error('Gemini API request timed out after 25 seconds');
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
    
    // Log the full response structure for debugging
    console.log('Gemini response structure:', JSON.stringify(result, null, 2));
    
    // Check if there's a finish reason that explains missing content
    if (result?.candidates?.[0]?.finishReason && result.candidates[0].finishReason !== 'STOP') {
      console.log('Non-standard finish reason:', result.candidates[0].finishReason);
      
      if (result.candidates[0].finishReason === 'MAX_TOKENS') {
        throw new Error('Response truncated - hit token limit');
      } else if (result.candidates[0].finishReason === 'SAFETY') {
        throw new Error('Response blocked by safety filters');
      }
    }
    
    // Extract reply with fallback logic
    let reply = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // If not found in expected location, search for it
    if (!reply && result?.candidates) {
      for (const candidate of result.candidates) {
        if (candidate?.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part?.text) {
              reply = part.text;
              break;
            }
          }
        }
        if (reply) break;
      }
    }

    if (!reply) {
      throw new Error('No response from AI service');
    }

    // Process the response based on step
    let finalResult;
    
    if (requestData.analysisMode || requestData.modificationMode) {
      // For analysis/modification, just return the raw reply
      finalResult = {
        reply,
        prompts: reply  // Also include as 'prompts' for compatibility
      };
    } else if (step === 1) {
      finalResult = {
        reply,
        convo: [...requestBody.contents, { role: 'model', parts: [{ text: reply }] }],
        originalRequestData: originalFullRequestData // Pass back the original request data
      };
    } else if (step === 2) {
      // Parse scenes for step 2
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

      finalResult = {
        reply,
        scenes,
        convo: [...requestBody.contents, { role: 'model', parts: [{ text: reply }] }]
      };
    }

    // Update job with successful results
    await JobStorage.set(jobId, {
      status: 'completed',
      result: finalResult,
      created: Date.now(),
      lastUpdated: Date.now()
    }, context);

  } catch (error) {
    console.error(`Error processing job ${jobId}:`, error);
    
    // Update job with error
    await JobStorage.set(jobId, {
      status: 'error',
      error: error.message,
      created: Date.now(),
      lastUpdated: Date.now()
    }, context);
    
    throw error;
  }
}
