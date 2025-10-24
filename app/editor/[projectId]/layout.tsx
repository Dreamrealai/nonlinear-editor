'use client';

import { useState } from 'react';
import { ChatBox } from '@/components/editor/ChatBox';
import { useParams } from 'next/navigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const projectId = params.projectId as string;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen w-screen overflow-hidden flex">
      {/* Main Editor */}
      <div className="flex-1 overflow-hidden">{children}</div>

      {/* AI Assistant Sidebar */}
      {projectId && (
        <div className={sidebarCollapsed ? 'w-0' : 'w-96'} style={{ transition: 'width 0.3s' }}>
          <ErrorBoundary
            name="AIAssistant"
            context={{ projectId, component: 'ChatBox' }}
            fallback={
              <div className="flex h-full items-center justify-center bg-white border-l border-neutral-200 p-4">
                <div className="max-w-sm rounded-lg border border-orange-200 bg-orange-50 p-6 text-center">
                  <h3 className="text-lg font-semibold text-orange-900 mb-2">AI Assistant Error</h3>
                  <p className="text-sm text-orange-700 mb-4">
                    The AI assistant encountered an error. Your project is safe.
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
                  >
                    Reload Assistant
                  </button>
                </div>
              </div>
            }
          >
            <ChatBox projectId={projectId} collapsed={sidebarCollapsed} />
          </ErrorBoundary>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="fixed right-4 top-20 z-50 rounded-lg bg-white border border-neutral-200 p-2 shadow-lg hover:bg-neutral-50"
        title={sidebarCollapsed ? 'Show DreamReal Assistant' : 'Hide DreamReal Assistant'}
      >
        <svg
          className="h-5 w-5 text-neutral-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {sidebarCollapsed ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          )}
        </svg>
      </button>
    </div>
  );
}
