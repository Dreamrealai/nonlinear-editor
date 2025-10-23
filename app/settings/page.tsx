'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { SubscriptionManager } from '@/components/SubscriptionManager';
import toast, { Toaster } from 'react-hot-toast';

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
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        router.push('/signin');
        return;
      }
      setUserEmail(user.email || null);
      setLoading(false);
    };

    loadUser();
  }, [supabaseClient, router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supabaseClient) return;

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);

    try {
      const { error } = await supabaseClient.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Failed to update password:', error);
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
      // First, delete all user's projects
      const { error: projectsError } = await supabaseClient
        .from('projects')
        .delete()
        .eq('user_id', (await supabaseClient.auth.getUser()).data.user?.id);

      if (projectsError) throw projectsError;

      // Note: Supabase doesn't allow users to delete their own accounts from the client
      // This would typically require an admin function or server-side endpoint
      toast.error('Account deletion requires admin access. Please contact support.');

    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error('Failed to delete account');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="text-neutral-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <Toaster position="bottom-right" />
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors mb-4"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Projects
          </Link>
          <h1 className="text-3xl font-bold text-neutral-900">Account Settings</h1>
        </div>

        {/* Subscription Manager */}
        <SubscriptionManager />

        {/* Account Information */}
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-neutral-900">Account Information</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700">Email</label>
              <p className="mt-1 text-sm text-neutral-900">{userEmail}</p>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-neutral-900">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-neutral-700">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-4 py-2 text-neutral-900 focus:border-neutral-500 focus:outline-none"
                placeholder="Enter new password"
                minLength={6}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-4 py-2 text-neutral-900 focus:border-neutral-500 focus:outline-none"
                placeholder="Confirm new password"
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={passwordLoading || !newPassword || !confirmPassword}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-red-900">Danger Zone</h2>
          <div className="space-y-3">
            <p className="text-sm text-red-700">
              Once you delete your account, there is no going back. This will permanently delete all your projects and data.
            </p>
            <button
              onClick={() => void handleDeleteAccount()}
              disabled={deleteLoading}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleteLoading ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
