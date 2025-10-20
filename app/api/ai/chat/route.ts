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

    // Parse chat history
    let chatHistory: Message[] = [];
    if (typeof chatHistoryJson === 'string' && chatHistoryJson.trim().length > 0) {
      try {
        chatHistory = JSON.parse(chatHistoryJson);
      } catch {
        return NextResponse.json(
          { error: 'Invalid chat history' },
          { status: 400 }
        );
      }
    }

    // Process attached files
    const files: { data: string; mimeType: string }[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file-') && value instanceof File) {
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
