'use client';

import { useEffect } from 'react';
import { browserLogger } from '@/lib/browserLogger';

export default function EditorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    browserLogger.error({ error, digest: error.digest }, 'Editor error');
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-neutral-900">Editor Error</h2>
          <p className="mt-2 text-sm text-neutral-600">
            The video editor encountered an unexpected error.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-neutral-700"
          >
            Reload editor
          </button>
          <button
            onClick={() => (window.location.href = '/')}
            className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 shadow hover:bg-neutral-50"
          >
            Back to projects
          </button>
        </div>

        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mt-4 rounded-lg bg-red-50 p-4">
            <p className="text-xs font-mono text-red-800 break-words">{error.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
