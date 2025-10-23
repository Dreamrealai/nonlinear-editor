import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { chat } from '@/lib/gemini';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const message = formData.get('message');
    const model = formData.get('model');
    const projectId = formData.get('projectId');
    const chatHistoryJson = formData.get('chatHistory');

    if (typeof message !== 'string' || typeof model !== 'string' || typeof projectId !== 'string') {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate message length
    const MAX_MESSAGE_LENGTH = 5000;
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: 'Message too long' },
        { status: 400 }
      );
    }

    // Parse chat history with size limits
    const MAX_HISTORY_SIZE = 100 * 1024; // 100KB
    const MAX_MESSAGES = 50;
    let chatHistory: Message[] = [];
    if (typeof chatHistoryJson === 'string' && chatHistoryJson.trim().length > 0) {
      if (chatHistoryJson.length > MAX_HISTORY_SIZE) {
        return NextResponse.json(
          { error: 'Chat history too large' },
          { status: 400 }
        );
      }

      try {
        chatHistory = JSON.parse(chatHistoryJson);

        if (!Array.isArray(chatHistory) || chatHistory.length > MAX_MESSAGES) {
          return NextResponse.json(
            { error: 'Invalid chat history format' },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: 'Invalid chat history' },
          { status: 400 }
        );
      }
    }

    // Process attached files with validation
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
    const MAX_FILES = 5;
    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

    const files: { data: string; mimeType: string }[] = [];
    let fileCount = 0;

    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file-') && value instanceof File) {
        fileCount++;

        if (fileCount > MAX_FILES) {
          return NextResponse.json(
            { error: `Maximum ${MAX_FILES} files allowed` },
            { status: 400 }
          );
        }

        if (value.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { error: `File ${value.name} exceeds maximum size of 10MB` },
            { status: 413 }
          );
        }

        if (!ALLOWED_MIME_TYPES.includes(value.type)) {
          return NextResponse.json(
            { error: `Invalid file type: ${value.type}` },
            { status: 400 }
          );
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
    const history = chatHistory.map(msg => ({
      role: (msg.role === 'user' ? 'user' : 'model') as 'user' | 'model',
      parts: [{ text: msg.content }],
    }));

    // Call Gemini
    const response = await chat({
      model,
      message,
      history,
      files,
    });

    return NextResponse.json({
      response,
      model,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
