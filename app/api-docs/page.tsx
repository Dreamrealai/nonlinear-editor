'use client';

import dynamic from 'next/dynamic';

// Lazy load the heavy @scalar/api-reference-react library
// This is only needed for API documentation pages and can be loaded on-demand
const ApiReferenceReact = dynamic(
  () => import('@scalar/api-reference-react').then((mod) => mod.ApiReferenceReact),
  {
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-600"></div>
          <span className="text-sm text-neutral-600">Loading API documentation...</span>
        </div>
      </div>
    ),
    ssr: false,
  }
);

// Note: @scalar/api-reference-react includes its own CSS automatically

export default function APIDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      <ApiReferenceReact
        configuration={{
          url: '/openapi.json',
        }}
      />
    </div>
  );
}
