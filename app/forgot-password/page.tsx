'use client';

import { useState, useEffect } from 'react';
import { createBrowserSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });

      if (error) throw error;

      setSuccess(true);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div>
          <h2 className="text-center text-3xl font-bold text-neutral-900">
            Forgot Password?
          </h2>
          <p className="mt-2 text-center text-sm text-neutral-600">
            No worries! Enter your email and we&apos;ll send you reset instructions.
          </p>
        </div>

        {success ? (
          <div className="space-y-6">
            <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-600">
              Password reset link sent! Please check your email.
            </div>
            <div className="text-center">
              <Link
                href="/signin"
                className="text-sm font-semibold text-neutral-900 hover:text-neutral-700"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div className="text-center">
              <Link
                href="/signin"
                className="text-sm font-semibold text-neutral-600 hover:text-neutral-900"
              >
                Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
