'use client';

import React from 'react';
import { browserLogger } from '@/lib/browserLogger';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** Optional name for this error boundary (helps identify which component failed) */
  name?: string;
  /** Optional callback when error occurs */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Optional additional context to log with errors */
  context?: Record<string, unknown>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Update state with error info for display
    this.setState({ errorInfo });

    // Build context for logging
    const logContext = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      componentStack: errorInfo.componentStack,
      boundaryName: this.props.name || 'Unknown',
      type: 'react_error_boundary',
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      timestamp: new Date().toISOString(),
      ...(this.props.context || {}),
    };

    // Log to Axiom via browserLogger
    browserLogger.error(
      logContext,
      `React Error Boundary [${this.props.name || 'Unknown'}] caught error: ${error.message}`
    );

    // Call optional error callback
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (callbackError) {
        // Prevent callback errors from causing infinite loops
        browserLogger.error(
          { error: callbackError, boundaryName: this.props.name },
          'Error in ErrorBoundary onError callback'
        );
      }
    }
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
          <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-neutral-900">Something went wrong</h2>
            </div>

            <p className="mb-4 text-sm text-neutral-600">
              The application encountered an unexpected error. Please try reloading the page.
            </p>

            {this.state.error && (
              <details className="mb-4 rounded bg-neutral-50 p-3">
                <summary className="cursor-pointer text-sm font-medium text-neutral-700">
                  Error details
                </summary>
                <div className="mt-2 space-y-2">
                  <div>
                    <div className="text-xs font-semibold text-neutral-700">Error Message:</div>
                    <pre className="mt-1 overflow-auto text-xs text-neutral-600">
                      {this.state.error.message}
                    </pre>
                  </div>
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <div className="text-xs font-semibold text-neutral-700">Component Stack:</div>
                      <pre className="mt-1 overflow-auto text-xs text-neutral-600 max-h-32">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                  {this.props.name && (
                    <div>
                      <div className="text-xs font-semibold text-neutral-700">Boundary:</div>
                      <div className="mt-1 text-xs text-neutral-600">{this.props.name}</div>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Reload Page
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="flex-1 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
