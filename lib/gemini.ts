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
 *
 * Supported Models:
 * - gemini-2.5-flash: Fast, balanced model for most use cases
 * - gemini-2.5-pro: More capable but slower model for complex tasks
 *
 * Required Environment Variables:
 * - GEMINI_API_KEY: Google AI Studio API key
 *
 * @see https://ai.google.dev/gemini-api/docs
 */

import { GoogleGenerativeAI, Part } from '@google/generative-ai';

/**
 * Creates a Google Generative AI client instance.
 *
 * @returns Configured GoogleGenerativeAI instance
 * @throws Error if GEMINI_API_KEY env var is missing
 */
export function makeGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }

  return new GoogleGenerativeAI(apiKey);
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
 * @param params.model - Gemini model to use (e.g., "gemini-2.5-flash")
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
}) {
  const genAI = makeGenAI();
  const model = genAI.getGenerativeModel({ model: params.model });

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
      maxOutputTokens: 2048, // Max response length
      temperature: 0.7, // Creativity level (0-1)
      topP: 0.9, // Nucleus sampling (0-1)
      topK: 40, // Token selection pool size
    },
  });

  // Send message with timeout and retry logic
  const maxRetries = 3;
  const timeout = 60000; // 60 seconds

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Create promise that rejects on timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error('Gemini API request timeout after 60s'));
        });
      });

      // Race between API call and timeout
      const result = await Promise.race([
        chatSession.sendMessage(parts),
        timeoutPromise,
      ]);

      clearTimeout(timeoutId);
      return result.response.text();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;

      if (error instanceof Error && error.message.includes('timeout')) {
        if (isLastAttempt) {
          throw new Error(`Gemini API timeout after ${maxRetries} attempts`);
        }
        // Exponential backoff: 1s, 2s, 4s
        const backoffDelay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        continue;
      }

      // For non-timeout errors, throw immediately
      throw error;
    }
  }

  throw new Error('Gemini API request failed after all retry attempts');
}
