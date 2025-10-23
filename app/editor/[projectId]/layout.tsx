'use client';

import { useState } from 'react';
import ChatBox from '@/components/editor/ChatBox';
import { useParams } from 'next/navigation';

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const projectId = params.projectId as string;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen w-screen overflow-hidden flex">
      {/* Main Editor */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>

      {/* AI Assistant Sidebar */}
      {projectId && (
        <div className={sidebarCollapsed ? 'w-0' : 'w-96'} style={{ transition: 'width 0.3s' }}>
          <ChatBox projectId={projectId} collapsed={sidebarCollapsed} />
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="fixed right-4 top-20 z-50 rounded-lg bg-white border border-neutral-200 p-2 shadow-lg hover:bg-neutral-50"
        title={sidebarCollapsed ? 'Show DreamReal Assistant' : 'Hide DreamReal Assistant'}
      >
        <svg className="h-5 w-5 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {sidebarCollapsed ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          )}
        </svg>
      </button>
    </div>
  );
}
