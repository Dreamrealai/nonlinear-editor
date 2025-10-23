'use client';

import EditorHeader from '@/components/EditorHeader';

interface KeyFrameEditorClientProps {
  projectId: string;
}

export default function KeyFrameEditorClient({ projectId }: KeyFrameEditorClientProps) {
  return (
    <div className="flex h-full flex-col">
      <EditorHeader projectId={projectId} currentTab="keyframe-editor" />
      <div className="flex h-full items-center justify-center bg-neutral-50 p-6">
        <div className="text-center">
          <div className="mb-4 flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-blue-100">
            <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Key Frame Editor</h1>
          <p className="text-neutral-500">Coming soon...</p>
        </div>
      </div>
    </div>
  );
}
