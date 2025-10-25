'use client';

import React from 'react';
import Link from 'next/link';

interface ErrorFallbackProps {
  title: string;
  message: string;
}

export function ErrorFallback({ title, message }: ErrorFallbackProps): React.JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-neutral-50 p-8">
      <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 shadow-lg text-center">
        <h2 className="text-xl font-semibold text-neutral-900 mb-3">{title}</h2>
        <p className="text-sm text-neutral-600 mb-4">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Reload Page
          </button>
          <Link
            href="/"
            className="flex-1 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 text-center"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
