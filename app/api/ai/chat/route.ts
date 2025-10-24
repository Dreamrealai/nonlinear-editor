import { NextRequest } from 'next/server';
import { chat } from '@/lib/gemini';
import { serverLogger } from '@/lib/serverLogger';
import {
  errorResponse,
  successResponse,
  serviceUnavailableResponse,
  validationError,
} from '@/lib/api/response';
import { validateString, validateUUID, validateAll } from '@/lib/api/validation';
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

async function handleChatPost(request: NextRequest, context: AuthContext) {
  const { user } = context;

  const formData = await request.formData();
  const message = formData.get('message');
  const model = formData.get('model');
  const projectId = formData.get('projectId');
  const chatHistoryJson = formData.get('chatHistory');

  // Validate all required inputs using centralized validation utilities
  const validation = validateAll([
    validateString(message, 'message', { minLength: 1, maxLength: MAX_MESSAGE_LENGTH }),
    validateString(model, 'model', { minLength: 1 }),
    validateUUID(projectId, 'projectId'),
  ]);

  if (!validation.valid) {
    const firstError = validation.errors[0];
    if (!firstError) {
      return validationError('Validation failed');
    }

    serverLogger.warn(
      {
        event: 'ai.chat.validation_error',
        userId: user.id,
        field: firstError.field,
        error: firstError.message,
      },
      `Validation error: ${firstError.message}`
    );
    return validationError(firstError.message, firstError.field);
  }

  // After validation, TypeScript knows these are strings
  const validatedMessage = message as string;
  const validatedModel = model as string;

  // Parse chat history with size limits
  let chatHistory: Message[] = [];
  if (typeof chatHistoryJson === 'string' && chatHistoryJson.trim().length > 0) {
    if (chatHistoryJson.length > MAX_HISTORY_SIZE) {
      return validationError('Chat history too large', 'chatHistory');
    }

    try {
      chatHistory = JSON.parse(chatHistoryJson);

      if (!Array.isArray(chatHistory) || chatHistory.length > MAX_MESSAGES) {
        return validationError('Invalid chat history format', 'chatHistory');
      }
    } catch {
      return validationError('Invalid chat history JSON', 'chatHistory');
    }
  }

  // Process attached files with validation
  const files: { data: string; mimeType: string }[] = [];
  let fileCount = 0;

  for (const [key, value] of formData.entries()) {
    if (key.startsWith('file-') && value instanceof File) {
      fileCount++;

      if (fileCount > MAX_FILES) {
        return validationError(`Maximum ${MAX_FILES} files allowed`, 'files');
      }

      if (value.size > MAX_FILE_SIZE) {
        return errorResponse(`File ${value.name} exceeds maximum size of 10MB`, 413);
      }

      if (!ALLOWED_MIME_TYPES.includes(value.type)) {
        return validationError(`Invalid file type: ${value.type}`, 'files');
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
  const history = chatHistory.map((msg) => ({
    role: (msg.role === 'user' ? 'user' : 'model') as 'user' | 'model',
    parts: [{ text: msg.content }],
  }));

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
}

// Export with authentication middleware and rate limiting
export const POST = withAuth(handleChatPost, {
  route: '/api/ai/chat',
  rateLimit: RATE_LIMITS.tier2_resource_creation, // 10 requests per minute for AI operations
});
