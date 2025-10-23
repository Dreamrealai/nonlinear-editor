'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import Link from 'next/link';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingGuest, setLoadingGuest] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(true);

  // Check Supabase configuration on mount
  useEffect(() => {
    setSupabaseConfigured(isSupabaseConfigured());
  }, []);

  // Check for confirmation success message
  useEffect(() => {
    const confirmed = searchParams.get('confirmed');
    if (confirmed === 'true') {
      setSuccess('Email confirmed! You can now sign in.');
    }
  }, [searchParams]);

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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate email format
    const { validateEmail, normalizeEmail } = await import('@/lib/validation/email');
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      setError(emailValidation.message || 'Invalid email');
      return;
    }

    setLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizeEmail(email),
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Redirect to home - middleware will handle session check
        router.push('/');
      }
    } catch (err) {
      if (err instanceof Error) {
        // Provide more user-friendly error messages
        if (err.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please try again.');
        } else if (err.message.includes('Email not confirmed')) {
          setError('Please confirm your email address before signing in.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setLoadingGuest(true);
    setError('');
    setSuccess('');

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInAnonymously();

      if (error) throw error;

      // Redirect to home - middleware will handle session check
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in as guest');
    } finally {
      setLoadingGuest(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div>
          <h2 className="text-center text-3xl font-bold text-neutral-900">
            Sign in to Editor
          </h2>
          <p className="mt-2 text-center text-sm text-neutral-600">
            Welcome back! Please enter your details.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSignIn}>
          <div className="space-y-4">
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
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                placeholder="you@example.com"
                disabled={loading || loadingGuest}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-neutral-600 hover:text-neutral-900"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-neutral-300 px-3 py-2 pr-10 text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  placeholder="••••••••"
                  disabled={loading || loadingGuest}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                  disabled={loading || loadingGuest}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-600">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || loadingGuest}
            className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-neutral-500">Or continue as</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAnonymousSignIn}
          disabled={loading || loadingGuest}
          className="w-full rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-600 shadow-sm hover:bg-neutral-100 hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingGuest ? 'Loading...' : 'Continue as Guest'}
        </button>

        <div className="text-center text-sm text-neutral-600">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-semibold text-neutral-900 hover:text-neutral-700">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
