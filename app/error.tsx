'use client';

import { useEffect } from 'react';
import { browserLogger } from '@/lib/browserLogger';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    browserLogger.error({ error, digest: error.digest }, 'Application error');
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-neutral-900">Something went wrong!</h2>
          <p className="mt-2 text-sm text-neutral-600">
            An unexpected error occurred. Please try again.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            Try again
          </button>
          <button
            onClick={() => (window.location.href = '/')}
            className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 shadow hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            Go home
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
