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
    <div className="h-screen w-screen overflow-hidden flex flex-col lg:flex-row">
      {/* Main Editor */}
      <div className="flex-1 overflow-hidden">{children}</div>

      {/* AI Assistant Sidebar - Desktop (Right Side) */}
      {projectId && (
        <>
          {/* Desktop Sidebar */}
          <div className={`hidden lg:block ${sidebarCollapsed ? 'w-0' : 'w-96'}`} style={{ transition: 'width 0.3s' }}>
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

          {/* Mobile Bottom Drawer */}
          {!sidebarCollapsed && (
            <>
              <div
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setSidebarCollapsed(true)}
              />
              <div className="fixed bottom-0 inset-x-0 h-[60vh] bg-white shadow-xl z-50 lg:hidden overflow-hidden">
                <ErrorBoundary
                  name="AIAssistant"
                  context={{ projectId, component: 'ChatBox' }}
                  fallback={
                    <div className="flex h-full items-center justify-center bg-white p-4">
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
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b border-neutral-200">
                      <h2 className="text-lg font-semibold text-neutral-900">AI Assistant</h2>
                      <button
                        onClick={() => setSidebarCollapsed(true)}
                        className="p-2 rounded-lg hover:bg-neutral-100"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <ChatBox projectId={projectId} collapsed={false} />
                    </div>
                  </div>
                </ErrorBoundary>
              </div>
            </>
          )}
        </>
      )}

      {/* Toggle Button - Desktop (Right Side) */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="fixed right-4 top-20 z-50 rounded-lg bg-white border border-neutral-200 p-2 shadow-lg hover:bg-neutral-50 hidden lg:block"
        title={sidebarCollapsed ? 'Show AI Assistant' : 'Hide AI Assistant'}
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

      {/* Toggle Button - Mobile (Floating Button) */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="fixed right-4 bottom-4 z-50 rounded-full bg-purple-600 p-4 shadow-lg hover:bg-purple-700 lg:hidden"
        title={sidebarCollapsed ? 'Show AI Assistant' : 'Hide AI Assistant'}
      >
        <svg
          className="h-6 w-6 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      </button>
    </div>
  );
}
