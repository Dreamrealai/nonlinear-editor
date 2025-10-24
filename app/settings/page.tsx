'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { SubscriptionManager } from '@/components/SubscriptionManager';
import { ActivityHistory } from '@/components/ActivityHistory';
import { KeyboardShortcutsPanel } from '@/components/settings/KeyboardShortcutsPanel';
import toast, { Toaster } from 'react-hot-toast';
import { browserLogger } from '@/lib/browserLogger';

export default function SettingsPage() {
  const router = useRouter();
  const { supabaseClient } = useSupabase();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!supabaseClient) return;

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();
      if (!user) {
        router.push('/signin');
        return;
      }
      setUserEmail(user.email || null);
      setLoading(false);
    };

    loadUser();
  }, [supabaseClient, router]);

  // Handle successful Stripe checkout
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (sessionId) {
      toast.success('Successfully upgraded to Premium! Your subscription is now active.', {
        duration: 5000,
        icon: '🎉',
      });

      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete('session_id');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supabaseClient) return;

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Validate password strength
    const { validatePasswordStrength } = await import('@/lib/validation/password');
    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
      toast.error(validation.message || 'Password does not meet requirements');
      return;
    }

    setPasswordLoading(true);

    try {
      const { error } = await supabaseClient.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      browserLogger.error({ error }, 'Failed to update password');
      toast.error('Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!supabaseClient) return;

    const confirmed = confirm(
      'Are you sure you want to delete your account? This will permanently delete all your projects and data. This action cannot be undone.'
    );

    if (!confirmed) return;

    const doubleConfirm = confirm(
      'This is your final warning. All your data will be permanently deleted. Are you absolutely sure?'
    );

    if (!doubleConfirm) return;

    setDeleteLoading(true);

    try {
      // Call the account deletion API endpoint
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      // Account successfully deleted
      toast.success('Account successfully deleted. Redirecting to sign up...');

      // Sign out and redirect to signup page
      await supabaseClient.auth.signOut();

      // Wait a moment for the toast to be visible
      setTimeout(() => {
        router.push('/signup');
      }, 1500);
    } catch (error) {
      browserLogger.error({ error }, 'Failed to delete account');
      toast.error(error instanceof Error ? error.message : 'Failed to delete account');
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-50 via-neutral-50 to-neutral-100 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-800">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600 motion-reduce:animate-none motion-reduce:border-t-8 dark:border-purple-800 dark:border-t-purple-400" role="status" aria-label="Loading settings"></div>
          <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Loading your settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-neutral-50 to-neutral-100">
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: 'font-medium',
          duration: 3000,
        }}
      />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header with elegant back button */}
        <div className="mb-10">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-all duration-200 mb-6"
          >
            <svg
              className="h-4 w-4 transition-transform group-hover:-translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Projects
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-700 shadow-lg">
              <svg
                className="h-7 w-7 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-neutral-900 tracking-tight">Settings</h1>
              <p className="text-sm text-neutral-600 mt-1">Manage your account and preferences</p>
            </div>
          </div>
        </div>

        {/* Subscription Manager with enhanced styling */}
        <div className="mb-8">
          <SubscriptionManager />
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Account Information with icon */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                <svg
                  className="h-5 w-5 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-neutral-900">Account Information</h2>
            </div>

            <div className="space-y-4">
              <div className="group">
                <div className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">
                  Email Address
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-neutral-50 px-4 py-3 border border-neutral-200 group-hover:border-neutral-300 transition-colors">
                  <svg
                    className="h-4 w-4 text-neutral-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-sm font-medium text-neutral-900">{userEmail}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Change Password with enhanced UX */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                <svg
                  className="h-5 w-5 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-neutral-900">Security</h2>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2"
                >
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:border-green-500 focus:ring-2 focus:ring-green-100 focus:outline-none transition-all"
                  placeholder="Enter new password"
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:border-green-500 focus:ring-2 focus:ring-green-100 focus:outline-none transition-all"
                  placeholder="Confirm new password"
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <button
                type="submit"
                disabled={passwordLoading || !newPassword || !confirmPassword}
                className="w-full rounded-lg bg-gradient-to-r from-neutral-900 to-neutral-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:from-neutral-800 hover:to-neutral-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-md transition-all duration-200"
              >
                {passwordLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Updating...
                  </span>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Activity History - Full width */}
        <div className="mt-8">
          <ActivityHistory />
        </div>

        {/* Keyboard Shortcuts - Full width */}
        <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200 dark:border-neutral-700 dark:bg-neutral-800">
          <KeyboardShortcutsPanel />
        </div>

        {/* Danger Zone - Enhanced warning design */}
        <div className="mt-8 rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-50/50 p-6 shadow-sm dark:border-red-800 dark:bg-gradient-to-br dark:from-red-900/20 dark:to-red-900/10">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-red-100">
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
            <div className="flex-1">
              <h2 className="text-xl font-bold text-red-900 mb-2">Danger Zone</h2>
              <p className="text-sm text-red-700 leading-relaxed mb-4">
                Once you delete your account, there is no going back. This will permanently delete
                all your projects, data, and subscription information. This action cannot be undone.
              </p>
              <button
                onClick={() => void handleDeleteAccount()}
                disabled={deleteLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-red-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-md transition-all duration-200"
              >
                {deleteLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Deleting Account...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Delete Account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
