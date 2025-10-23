'use client';

import Image from 'next/image';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { browserLogger } from '@/lib/browserLogger';
import clsx from 'clsx';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  model?: string;
  attachments?: Array<{
    name: string;
    type: string;
    url: string;
  }>;
}

interface ChatBoxProps {
  projectId: string;
  collapsed: boolean;
}

const GEMINI_MODELS = [
  { id: 'gemini-flash-latest', name: 'Gemini Flash', description: 'Latest & fastest' },
  { id: 'gemini-2.5-pro', name: 'Gemini Pro', description: 'Advanced thinking & reasoning' },
] as const;

export default function ChatBox({ projectId, collapsed }: ChatBoxProps) {
  const { supabaseClient } = useSupabase();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-flash-latest');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CRITICAL FIX: Track blob URLs for cleanup to prevent memory leaks
  const attachmentBlobUrlsRef = useRef<Map<File, string>>(new Map());

  const supabase = supabaseClient;

  // Cleanup blob URLs on unmount
  useEffect(() => {
    // Copy ref value to local variable for cleanup
    const blobUrlsMap = attachmentBlobUrlsRef.current;

    return () => {
      // Revoke all blob URLs to prevent memory leaks
      blobUrlsMap.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      blobUrlsMap.clear();
    };
  }, []);

  // Load chat messages
  const loadMessages = useCallback(async () => {
    if (!supabase || !projectId) return;

    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) {
        browserLogger.error({ error, projectId }, 'Failed to load chat messages');
        return;
      }

      if (data) {
        setMessages(data as Message[]);
      }
    } catch (error) {
      browserLogger.error({ error, projectId }, 'Error loading chat messages');
    } finally {
      setLoadingMessages(false);
    }
  }, [supabase, projectId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Real-time subscriptions
  useEffect(() => {
    if (!supabase || !projectId) return;

    const channel = supabase
      .channel(`chat_messages:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, projectId, loadMessages]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;
    if (!supabase) return;

    const userMessageContent = input;
    const attachmentUrls: string[] = [];
    const userAttachments = attachments.map(file => {
      // Reuse existing blob URL or create new one
      let url = attachmentBlobUrlsRef.current.get(file);
      if (!url) {
        url = URL.createObjectURL(file);
        attachmentBlobUrlsRef.current.set(file, url);
      }
      attachmentUrls.push(url);
      return {
        name: file.name,
        type: file.type,
        url,
      };
    });

    // Save user message
    const { error: userError } = await supabase
      .from('chat_messages')
      .insert({
        project_id: projectId,
        role: 'user',
        content: userMessageContent,
        model: selectedModel,
        attachments: userAttachments.length > 0 ? userAttachments : null,
      })
      .select()
      .single();

    if (userError) {
      browserLogger.error({ error: userError, projectId }, 'Failed to save user message');
      attachmentUrls.forEach((url) => URL.revokeObjectURL(url));
      return;
    }

    setInput('');
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('message', userMessageContent);
      formData.append('model', selectedModel);
      formData.append('projectId', projectId);
      formData.append('chatHistory', JSON.stringify(messages));

      attachments.forEach((file, index) => {
        formData.append(`file-${index}`, file);
      });

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || response.statusText || 'Unknown error';
        const errorDetails = data.details ? `\n${data.details}` : '';
        const errorHelp = data.help ? `\n\n${data.help}` : '';
        throw new Error(`API request failed: ${errorMsg}${errorDetails}${errorHelp}`);
      }

      // Save assistant response
      await supabase
        .from('chat_messages')
        .insert({
          project_id: projectId,
          role: 'assistant',
          content: data.response || 'No response from AI',
          model: selectedModel,
        });

    } catch (error) {
      browserLogger.error({ error, projectId, model: selectedModel }, 'Chat error');

      await supabase
        .from('chat_messages')
        .insert({
          project_id: projectId,
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request.',
          model: selectedModel,
        });
    } finally {
      setIsLoading(false);

      // Revoke blob URLs for sent attachments to free memory
      attachments.forEach((file) => {
        const url = attachmentBlobUrlsRef.current.get(file);
        if (url) {
          URL.revokeObjectURL(url);
          attachmentBlobUrlsRef.current.delete(file);
        }
      });

      setAttachments([]);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      // CRITICAL FIX: Revoke blob URL when attachment is removed
      const fileToRemove = prev[index];
      if (fileToRemove) {
        const url = attachmentBlobUrlsRef.current.get(fileToRemove);
        if (url) {
          URL.revokeObjectURL(url);
          attachmentBlobUrlsRef.current.delete(fileToRemove);
        }
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearChat = async () => {
    if (!confirm('Are you sure you want to clear the entire chat history?')) {
      return;
    }

    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('project_id', projectId);

      if (error) {
        browserLogger.error({ error, projectId }, 'Failed to clear chat');
        alert('Failed to clear chat history');
      } else {
        setMessages([]);
      }
    } catch (error) {
      browserLogger.error({ error, projectId }, 'Error clearing chat');
      alert('Failed to clear chat history');
    }
  };

  if (collapsed) return null;

  return (
    <div className="flex h-full flex-col border-l border-neutral-200 bg-white">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div className="text-sm font-semibold text-neutral-900">DreamReal Assistant</div>
        </div>
      </div>

      {/* Controls */}
      <div className="border-b border-neutral-200 p-3">
        <div className="flex items-center gap-2">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {GEMINI_MODELS.map(model => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
          <button
            onClick={clearChat}
            className="rounded-lg border border-neutral-300 bg-white p-2 text-neutral-600 hover:bg-neutral-50 hover:text-red-600 transition-colors"
            title="Clear chat history"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loadingMessages ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Loading...
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-purple-100">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-neutral-900">Start a conversation</p>
            <p className="mt-1 text-xs text-neutral-500">Ask me anything about your video project</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={clsx(
                'flex gap-3',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={clsx(
                  'max-w-[85%] rounded-xl px-4 py-2.5',
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                    : 'bg-neutral-100 text-neutral-900'
                )}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.attachments.map((attachment, idx) => {
                      const isImage = attachment.type.startsWith('image/');
                      return (
                        <div
                          key={idx}
                          className={clsx(
                            'overflow-hidden rounded-lg',
                            isImage
                              ? 'max-w-[200px] border-2'
                              : 'flex items-center gap-2 border px-2 py-1',
                            message.role === 'user'
                              ? 'border-blue-400/50 bg-blue-500/20'
                              : 'border-neutral-300 bg-neutral-200/50'
                          )}
                        >
                          {isImage ? (
                            <Image
                              src={attachment.url}
                              alt={attachment.name}
                              width={200}
                              height={200}
                              className="h-auto w-full object-contain"
                              unoptimized
                            />
                          ) : (
                            <>
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              <span className="truncate text-xs">{attachment.name}</span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className={clsx('mt-1 text-xs', message.role === 'user' ? 'text-blue-200' : 'text-neutral-500')}>
                  {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-xl bg-neutral-100 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="border-t border-neutral-200 p-3">
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="group relative flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1"
              >
                <span className="text-xs text-neutral-700">{file.name}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-neutral-400 hover:text-red-600"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-neutral-200 p-3">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about your video project..."
            rows={2}
            className="flex-1 resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <div className="flex flex-col gap-2">
            <button
              onClick={handleSend}
              disabled={isLoading || (!input.trim() && attachments.length === 0)}
              className="rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 p-2 text-white hover:from-blue-700 hover:to-blue-800 disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-neutral-300 bg-white p-2 text-neutral-600 hover:bg-neutral-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
