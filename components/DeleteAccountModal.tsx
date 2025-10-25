'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { browserLogger } from '@/lib/browserLogger';

interface DeleteAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  loading: boolean;
}

/**
 * DeleteAccountModal Component
 *
 * A comprehensive confirmation modal for account deletion with multiple safety measures:
 * - Clear warning about data loss
 * - Type-to-confirm mechanism (user must type "DELETE" exactly)
 * - Multiple steps to prevent accidental deletion
 * - Disabled state during deletion process
 *
 * This component is critical for GDPR compliance and user data protection.
 */
export function DeleteAccountModal({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: DeleteAccountModalProps): React.ReactElement {
  const [confirmText, setConfirmText] = useState('');
  const [step, setStep] = useState<'warning' | 'confirm'>('warning');

  const isConfirmValid = confirmText === 'DELETE';

  const handleClose = (): void => {
    if (!loading) {
      setConfirmText('');
      setStep('warning');
      onOpenChange(false);
    }
  };

  const handleContinue = (): void => {
    setStep('confirm');
  };

  const handleConfirm = async (): Promise<void> => {
    if (!isConfirmValid || loading) {
      return;
    }

    try {
      await onConfirm();
      // Don't reset state here - parent will handle redirect
    } catch (error) {
      browserLogger.error({ error }, 'Account deletion failed');
      // Reset state on error so user can try again
      setConfirmText('');
      setStep('warning');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {step === 'warning' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
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
                <DialogTitle className="text-2xl">Delete Account</DialogTitle>
              </div>
              <DialogDescription className="text-left space-y-4 pt-4">
                <p className="text-base font-semibold text-red-900">
                  This action is permanent and cannot be undone.
                </p>

                <div className="space-y-3">
                  <p className="text-sm text-neutral-700">
                    Deleting your account will permanently remove:
                  </p>

                  <ul className="space-y-2 text-sm text-neutral-700">
                    <li className="flex items-start gap-2">
                      <svg
                        className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      <span>All your projects and timelines</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg
                        className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      <span>All uploaded assets (videos, images, audio)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg
                        className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      <span>All AI-generated content and edits</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg
                        className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      <span>Your chat history and preferences</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg
                        className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      <span>Your subscription and billing information</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg
                        className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      <span>Your account credentials and profile</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                  <div className="flex items-start gap-3">
                    <svg
                      className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="text-sm text-amber-900">
                      <p className="font-semibold mb-1">Legal Compliance Notice</p>
                      <p>
                        For legal and compliance purposes, anonymized audit logs may be retained for
                        a limited period as permitted by GDPR and other data protection regulations.
                      </p>
                    </div>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleContinue}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
              >
                Continue to Confirmation
              </button>
            </DialogFooter>
          </>
        )}

        {step === 'confirm' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
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
                <DialogTitle className="text-2xl">Final Confirmation</DialogTitle>
              </div>
              <DialogDescription className="text-left space-y-4 pt-4">
                <p className="text-base font-semibold text-red-900">
                  This is your last chance to cancel.
                </p>

                <p className="text-sm text-neutral-700">
                  To confirm account deletion, please type{' '}
                  <span className="font-mono font-bold text-red-600">DELETE</span> in the box below:
                </p>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e): void => setConfirmText(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    disabled={loading}
                    className="w-full rounded-lg border-2 border-neutral-300 bg-white px-4 py-3 text-sm font-mono font-semibold text-neutral-900 placeholder-neutral-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                    autoComplete="off"
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                  />

                  {confirmText && !isConfirmValid && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Please type exactly &quot;DELETE&quot; (all caps)
                    </p>
                  )}

                  {isConfirmValid && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Confirmation text is correct
                    </p>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(): undefined => void handleConfirm()}
                disabled={!isConfirmValid || loading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Deleting Account...
                  </span>
                ) : (
                  'Permanently Delete My Account'
                )}
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
