import { NextRequest, NextResponse } from 'next/server';
import { chat } from '@/lib/gemini';
import { serverLogger } from '@/lib/serverLogger';
import { errorResponse, successResponse, serviceUnavailableResponse } from '@/lib/api/response';
import { validateString, validateUUID, ValidationError } from '@/lib/validation';
import { withAuth, type AuthContext } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Constants for validation
const MAX_MESSAGE_LENGTH = 5000;
const MAX_HISTORY_SIZE = 100 * 1024; // 100KB
const MAX_MESSAGES = 50;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_FILES = 5;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

async function handleChatPost(request: NextRequest, context: AuthContext): Promise<NextResponse> {
  const { user } = context;

  try {
    const formData = await request.formData();
    const message = formData.get('message');
    const model = formData.get('model');
    const projectId = formData.get('projectId');
    const chatHistoryJson = formData.get('chatHistory');

    // Validate all required inputs using centralized validation utilities
    validateString(message, 'message', { minLength: 1, maxLength: MAX_MESSAGE_LENGTH });
    validateString(model, 'model', { minLength: 1 });
    validateUUID(projectId, 'projectId');

    // After validation, TypeScript knows these are strings
    const validatedMessage = message as string;
    const validatedModel = model as string;

    // Parse chat history with size limits
    let chatHistory: Message[] = [];
    if (typeof chatHistoryJson === 'string' && chatHistoryJson.trim().length > 0) {
      if (chatHistoryJson.length > MAX_HISTORY_SIZE) {
        return errorResponse('Chat history too large', 400, 'chatHistory');
      }

      try {
        chatHistory = JSON.parse(chatHistoryJson);

        if (!Array.isArray(chatHistory) || chatHistory.length > MAX_MESSAGES) {
          return errorResponse('Invalid chat history format', 400, 'chatHistory');
        }
      } catch {
        return errorResponse('Invalid chat history JSON', 400, 'chatHistory');
      }
    }

    // Process attached files with validation
    const files: { data: string; mimeType: string }[] = [];
    let fileCount = 0;

    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file-') && value instanceof File) {
        fileCount++;

        if (fileCount > MAX_FILES) {
          return errorResponse(`Maximum ${MAX_FILES} files allowed`, 400, 'files');
        }

        if (value.size > MAX_FILE_SIZE) {
          return errorResponse(`File ${value.name} exceeds maximum size of 10MB`, 413);
        }

        if (!ALLOWED_MIME_TYPES.includes(value.type)) {
          return errorResponse(`Invalid file type: ${value.type}`, 400, 'files');
        }

        const arrayBuffer = await value.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        files.push({
          data: base64,
          mimeType: value.type,
        });
      }
    }

    // Convert chat history to Gemini format
    const history = chatHistory.map(
      (msg): { role: 'user' | 'model'; parts: { text: string }[] } => ({
        role: (msg.role === 'user' ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: msg.content }],
      })
    );

    // Call Gemini (will use GEMINI_API_KEY or GOOGLE_SERVICE_ACCOUNT)
    try {
      const response = await chat({
        model: validatedModel,
        message: validatedMessage,
        history,
        files,
      });

      return successResponse({
        response,
        model: validatedModel,
        timestamp: new Date().toISOString(),
      });
    } catch (chatError) {
      serverLogger.error({ error: chatError, userId: user.id }, 'Gemini chat error');

      // Check if it's a configuration error
      if (
        chatError instanceof Error &&
        (chatError.message.includes('environment variable') ||
          chatError.message.includes('authenticate'))
      ) {
        return serviceUnavailableResponse('AI service not configured', {
          details: chatError.message,
          help: 'Please configure GOOGLE_SERVICE_ACCOUNT, AISTUDIO_API_KEY, or GEMINI_API_KEY in environment variables',
        });
      }

      // Other errors
      throw chatError;
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      serverLogger.warn(
        {
          event: 'ai.chat.validation_error',
          userId: user.id,
          field: error.field,
          error: error.message,
        },
        `Validation error: ${error.message}`
      );
      return errorResponse(error.message, 400, error.field);
    }

    // Log all errors for debugging
    serverLogger.error(
      {
        event: 'ai.chat.unhandled_error',
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        errorName: error instanceof Error ? error.name : 'Unknown',
      },
      'Unhandled error in chat endpoint'
    );

    // Return a generic error response instead of re-throwing
    // This prevents 500 errors from crashing the endpoint
    if (error instanceof Error) {
      return errorResponse(`Chat request failed: ${error.message}`, 500, undefined, {
        errorType: error.name,
      });
    }

    return errorResponse('An unexpected error occurred', 500);
  }
}

// Export with authentication middleware and rate limiting
const options = {
  route: '/api/ai/chat',
  rateLimit: RATE_LIMITS.tier2_resource_creation, // 10 requests per minute for AI operations
};

export const POST = withAuth(handleChatPost, options);
