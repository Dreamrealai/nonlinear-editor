/**
 * AssetErrorBoundary - Error boundary specifically for asset-related components
 *
 * Catches and handles errors in asset loading, display, and interaction.
 * Provides user-friendly error messages and recovery options.
 *
 * Features:
 * - Catches React errors in asset components
 * - Provides asset-specific error messages
 * - Offers retry and skip options
 * - Logs errors with asset context
 * - Graceful degradation for missing assets
 *
 * @example
 * ```tsx
 * <AssetErrorBoundary assetId={asset.id} assetName={asset.metadata?.filename}>
 *   <AssetPreview asset={asset} />
 * </AssetErrorBoundary>
 * ```
 */
'use client';

import React from 'react';
import { browserLogger } from '@/lib/browserLogger';

interface AssetErrorBoundaryProps {
  children: React.ReactNode;
  /** Asset ID for logging and error context */
  assetId?: string;
  /** Asset name for user-friendly error messages */
  assetName?: string;
  /** Custom fallback UI */
  fallback?: React.ReactNode;
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Callback when user clicks retry */
  onRetry?: () => void;
  /** Callback when user clicks skip */
  onSkip?: () => void;
}

interface AssetErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class AssetErrorBoundary extends React.Component<
  AssetErrorBoundaryProps,
  AssetErrorBoundaryState
> {
  constructor(props: AssetErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): AssetErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });

    // Truncate stack traces to prevent payload bloat
    const MAX_STACK_LENGTH = 2000;
    const truncatedComponentStack =
      errorInfo.componentStack && errorInfo.componentStack.length > MAX_STACK_LENGTH
        ? errorInfo.componentStack.substring(0, MAX_STACK_LENGTH) + '\n... (truncated)'
        : errorInfo.componentStack;

    // Build context for logging
    const logContext = {
      error: {
        name: error.name,
        message: error.message,
        stack:
          error.stack && error.stack.length > MAX_STACK_LENGTH
            ? error.stack.substring(0, MAX_STACK_LENGTH) + '\n... (truncated)'
            : error.stack,
      },
      componentStack: truncatedComponentStack,
      assetId: this.props.assetId,
      assetName: this.props.assetName,
      type: 'asset_error_boundary',
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      timestamp: new Date().toISOString(),
    };

    // Log to Axiom
    browserLogger.error(
      logContext,
      `Asset Error [${this.props.assetName || this.props.assetId || 'Unknown'}]: ${error.message}`
    );

    // Call optional error callback
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (callbackError) {
        browserLogger.error(
          { error: callbackError, assetId: this.props.assetId },
          'Error in AssetErrorBoundary onError callback'
        );
      }
    }
  }

  private handleRetry = (): void => {
    // Reset error state
    this.setState({ hasError: false, error: null, errorInfo: null });

    // Call optional retry callback
    if (this.props.onRetry) {
      try {
        this.props.onRetry();
      } catch (callbackError) {
        browserLogger.error(
          { error: callbackError, assetId: this.props.assetId },
          'Error in AssetErrorBoundary onRetry callback'
        );
      }
    }
  };

  private handleSkip = (): void => {
    // Call optional skip callback
    if (this.props.onSkip) {
      try {
        this.props.onSkip();
      } catch (callbackError) {
        browserLogger.error(
          { error: callbackError, assetId: this.props.assetId },
          'Error in AssetErrorBoundary onSkip callback'
        );
      }
    }
  };

  override render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default asset error UI
      return (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div className="mb-3 flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
              <svg
                className="h-5 w-5 text-orange-600"
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
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-orange-900">
                {this.props.assetName
                  ? `Problem loading "${this.props.assetName}"`
                  : 'Asset failed to load'}
              </h3>
              <p className="mt-1 text-xs text-orange-700">
                This asset encountered an error while loading. You can try loading it again, or skip
                it to continue working.
              </p>
            </div>
          </div>

          {this.state.error && process.env.NODE_ENV === 'development' && (
            <details className="mb-3 rounded bg-white p-2">
              <summary className="cursor-pointer text-xs font-medium text-orange-800">
                Error details (dev only)
              </summary>
              <pre className="mt-2 max-h-32 overflow-auto text-xs text-orange-700">
                {this.state.error.message}
              </pre>
            </details>
          )}

          <div className="flex gap-2">
            <button
              onClick={this.handleRetry}
              className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              Try Again
            </button>
            {this.props.onSkip && (
              <button
                onClick={this.handleSkip}
                className="rounded-md border border-orange-300 bg-white px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              >
                Skip
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional wrapper for AssetErrorBoundary with hooks support
 *
 * @example
 * ```tsx
 * <AssetErrorBoundaryWrapper
 *   assetId={asset.id}
 *   assetName={asset.metadata?.filename}
 *   onError={(error) => console.error('Asset error:', error)}
 *   onRetry={() => refetchAsset()}
 * >
 *   <AssetContent asset={asset} />
 * </AssetErrorBoundaryWrapper>
 * ```
 */
export function AssetErrorBoundaryWrapper(props: AssetErrorBoundaryProps) {
  return <AssetErrorBoundary {...props} />;
}
