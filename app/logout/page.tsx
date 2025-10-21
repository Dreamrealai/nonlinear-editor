'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

export default function LogoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [supabaseConfigured, setSupabaseConfigured] = useState(true);

  // Check Supabase configuration on mount
  useEffect(() => {
    setSupabaseConfigured(isSupabaseConfigured());
  }, []);

  // Show configuration error message
  if (!supabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="max-w-md rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-neutral-900">Supabase Not Configured</h1>
          <p className="mt-4 text-neutral-600">
            Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables to enable authentication.
          </p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    setLoading(true);
    setError('');

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      router.push('/signin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div>
          <h2 className="text-center text-3xl font-bold text-neutral-900">
            Sign Out
          </h2>
          <p className="mt-2 text-center text-sm text-neutral-600">
            Are you sure you want to sign out?
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={loading}
            className="flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 shadow hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loading}
            className="flex-1 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </div>
    </div>
  );
}
