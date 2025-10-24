/**
 * Google Gemini AI Integration
 *
 * Provides chat functionality using Google's Gemini multimodal models.
 * Supports text and image inputs for conversational AI interactions.
 *
 * Features:
 * - Multimodal input (text + images)
 * - Conversation history tracking
 * - Configurable generation parameters
 * - Service account authentication (Vertex AI) or API key (Google AI Studio)
 *
 * Supported Models:
 * - gemini-flash-latest: Latest Flash model (AI Studio)
 * - gemini-2.5-flash: Fast, balanced model for most use cases
 * - gemini-2.5-pro: More capable but slower model for complex tasks
 *
 * Required Environment Variables (priority order):
 * - AISTUDIO_API_KEY: Google AI Studio API key (preferred, supports "latest" aliases)
 * - GEMINI_API_KEY: Google AI Studio API key (alternative)
 * - GOOGLE_SERVICE_ACCOUNT: Service account JSON (fallback, for Vertex AI)
 *
 * @see https://ai.google.dev/gemini-api/docs
 */

import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { VertexAI, Content, Part as VertexPart } from '@google-cloud/vertexai';

/**
 * Configuration for Vertex AI or Google AI Studio
 */
type AIClient =
  | { type: 'vertex'; client: VertexAI; projectId: string }
  | { type: 'studio'; client: GoogleGenerativeAI };

/**
 * Creates an AI client instance.
 * Priority: AISTUDIO_API_KEY > GEMINI_API_KEY > GOOGLE_SERVICE_ACCOUNT
 *
 * @returns Configured AI client
 * @throws Error if no authentication method is available
 */
export async function makeAIClient(): Promise<AIClient> {
  // Try AI Studio API key first (supports "latest" model aliases)
  const aiStudioKey = process.env.AISTUDIO_API_KEY || process.env.GEMINI_API_KEY;

  if (aiStudioKey) {
    return { type: 'studio', client: new GoogleGenerativeAI(aiStudioKey) };
  }

  // Fallback to service account (Vertex AI)
  const serviceAccount = process.env.GOOGLE_SERVICE_ACCOUNT;

  if (serviceAccount) {
    let credentials;
    try {
      credentials = JSON.parse(serviceAccount);
    } catch (parseError) {
      // Log parse error for debugging (server-side only)
      if (typeof process !== 'undefined' && process.env) {
        const { serverLogger } = await import('./serverLogger');
        serverLogger.error({ error: parseError }, 'Failed to parse GOOGLE_SERVICE_ACCOUNT');
      }
      throw new Error('GOOGLE_SERVICE_ACCOUNT environment variable contains invalid JSON');
    }

    // Extract project ID from service account
    const projectId = credentials.project_id;
    if (!projectId) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT must contain project_id field');
    }

    try {
      // Use Vertex AI with service account
      const vertexAI = new VertexAI({
        project: projectId,
        location: 'us-central1',
        googleAuthOptions: {
          credentials,
        },
      });

      return { type: 'vertex', client: vertexAI, projectId };
    } catch (authError) {
      // Log initialization error for debugging (server-side only)
      if (typeof process !== 'undefined' && process.env) {
        const { serverLogger } = await import('./serverLogger');
        serverLogger.error({ error: authError, projectId }, 'Vertex AI initialization error');
      }
      throw new Error(`Failed to initialize Vertex AI: ${authError instanceof Error ? authError.message : 'Unknown error'}`);
    }
  }

  throw new Error('Either AISTUDIO_API_KEY, GEMINI_API_KEY, or GOOGLE_SERVICE_ACCOUNT environment variable is required');
}

/**
 * Maps Google AI Studio model names to Vertex AI model names.
 * Google AI Studio uses different model identifiers than Vertex AI.
 */
function normalizeModelName(modelName: string): string {
  const modelMap: Record<string, string> = {
    'gemini-flash-latest': 'gemini-2.5-flash',
    'gemini-pro-latest': 'gemini-2.5-pro',
    'gemini-1.5-flash': 'gemini-2.5-flash',
    'gemini-1.5-pro': 'gemini-2.5-pro',
  };

  return modelMap[modelName] || modelName;
}

/**
 * Sends a chat message to Gemini with optional conversation history and file attachments.
 *
 * Configuration:
 * - maxOutputTokens: 2048 (controls response length)
 * - temperature: 0.7 (creativity/randomness, 0=deterministic, 1=creative)
 * - topP: 0.9 (nucleus sampling threshold)
 * - topK: 40 (limits token selection pool)
 * - timeout: 60s with exponential backoff retry (3 attempts)
 *
 * @param params - Chat parameters
 * @param params.model - Gemini model to use (e.g., "gemini-2.5-flash" or "gemini-flash-latest")
 * @param params.message - User's message text
 * @param params.history - Previous conversation messages for context
 * @param params.files - Optional file attachments (base64 encoded with MIME type)
 * @returns AI-generated response text
 *
 * @example
 * // Simple text chat
 * const response = await chat({
 *   model: "gemini-2.5-flash",
 *   message: "Explain video editing"
 * });
 *
 * @example
 * // Chat with image
 * const response = await chat({
 *   model: "gemini-2.5-flash",
 *   message: "What's in this image?",
 *   files: [{ data: base64Image, mimeType: "image/jpeg" }]
 * });
 *
 * @example
 * // Multi-turn conversation
 * const response = await chat({
 *   model: "gemini-2.5-flash",
 *   message: "Continue the story",
 *   history: [
 *     { role: "user", parts: [{ text: "Tell me a story" }] },
 *     { role: "model", parts: [{ text: "Once upon a time..." }] }
 *   ]
 * });
 */
export async function chat(params: {
  /** Gemini model identifier */
  model: string;
  /** User's message text */
  message: string;
  /** Conversation history for context */
  history?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  /** File attachments (base64 data with MIME type) */
  files?: Array<{ data: string; mimeType: string }>;
}): Promise<string> {
  const aiClient = await makeAIClient();

  // Send message with retry logic (timeout handled by underlying SDK)
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (aiClient.type === 'vertex') {
        // Use Vertex AI SDK - normalize model name for compatibility
        const normalizedModel = normalizeModelName(params.model);
        const model = aiClient.client.getGenerativeModel({
          model: normalizedModel,
        });

        // Build message parts for Vertex AI
        const parts: VertexPart[] = [
          { text: params.message },
        ];

        // Add file attachments as inline data
        if (params.files && params.files.length > 0) {
          for (const file of params.files) {
            parts.push({
              inlineData: {
                mimeType: file.mimeType,
                data: file.data,
              },
            });
          }
        }

        // Convert history to Vertex AI format
        const vertexHistory: Content[] = (params.history || []).map((msg): { role: "user" | "model"; parts: { text: string; }[]; } => ({
          role: msg.role,
          parts: msg.parts.map((p): { text: string; } => ({ text: p.text })),
        }));

        // Start chat session with history and generation config
        const chatSession = model.startChat({
          history: vertexHistory,
          generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.7,
            topP: 0.9,
            topK: 40,
          },
        });

        // Send message
        const result = await chatSession.sendMessage(parts);
        const response = await result.response;
        return response.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
      } else {
        // Use Google AI Studio SDK (original implementation)
        const model = aiClient.client.getGenerativeModel({ model: params.model });

        // Build message parts (text + optional files)
        const parts: Part[] = [
          { text: params.message },
        ];

        // Add file attachments as inline data
        if (params.files && params.files.length > 0) {
          for (const file of params.files) {
            parts.push({
              inlineData: {
                data: file.data,
                mimeType: file.mimeType,
              },
            });
          }
        }

        // Start chat session with history and generation config
        const chatSession = model.startChat({
          history: params.history || [],
          generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.7,
            topP: 0.9,
            topK: 40,
          },
        });

        // Send message
        const result = await chatSession.sendMessage(parts);
        return result.response.text();
      }
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;

      if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('ETIMEDOUT'))) {
        if (isLastAttempt) {
          throw new Error(`Gemini API timeout after ${maxRetries} attempts`);
        }
        // Exponential backoff: 1s, 2s, 4s
        const backoffDelay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        continue;
      }

      // For non-timeout errors, throw immediately with more context
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Gemini API error: ${errorMessage}`);
    }
  }

  throw new Error('Gemini API request failed after all retry attempts');
}
