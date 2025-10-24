/**
 * SignUpPage Component
 *
 * User registration page with email/password
 * - Password strength validation
 * - Email confirmation flow
 * - Form validation and error handling
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createBrowserSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import {
  calculatePasswordStrength,
  getPasswordStrengthColor,
  validatePassword,
} from '@/lib/validation/password';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Eye, EyeOff } from 'lucide-react';

export default function SignUpPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [supabaseConfigured, setSupabaseConfigured] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    feedback: string;
  }>({ score: 0, feedback: '' });

  // Check Supabase configuration on mount
  useEffect(() => {
    setSupabaseConfigured(isSupabaseConfigured());
  }, []);

  // Calculate password strength
  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(password));
  }, [password]);

  // Show configuration error message
  if (!supabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="max-w-md rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-neutral-900">Supabase Not Configured</h1>
          <p className="mt-4 text-neutral-600">
            Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables to
            enable authentication.
          </p>
        </div>
      </div>
    );
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Validation
    const validationError = validatePassword(password, confirmPassword);
    if (validationError) {
      setError(validationError);
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/signin`,
        },
      });

      if (error) {
        // Handle user already registered error more gracefully
        if (
          error.message.includes('already registered') ||
          error.message.includes('already exists')
        ) {
          setError(
            'This email is already registered. Please sign in instead or use a different email.'
          );
        } else {
          setError(error.message);
        }
        return;
      }

      // Email confirmation required - user will receive email
      setSuccess(
        'Account created! Please check your email for a confirmation link to complete your signup.'
      );
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div>
          <h2 className="text-center text-3xl font-bold text-neutral-900">Create Your Account</h2>
          <p className="mt-2 text-center text-sm text-neutral-600">
            Get started with professional video editing
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
                Password
              </label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 text-neutral-500 hover:text-neutral-700"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
              {password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-neutral-600 mb-1">
                    <span>Password strength: {passwordStrength.feedback}</span>
                  </div>
                  <div className="h-1 w-full bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${getPasswordStrengthColor(
                        passwordStrength.score
                      )}`}
                      style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              <p className="mt-1 text-xs text-neutral-500">
                Must be at least 8 characters with mixed case, numbers, and symbols
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-neutral-700"
              >
                Confirm Password
              </label>
              <div className="relative mt-1">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 text-neutral-500 hover:text-neutral-700"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          {success && (
            <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-600">{success}</div>
          )}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? <LoadingSpinner size={20} /> : 'Create Account'}
          </Button>
        </form>

        <div className="text-center text-sm text-neutral-600">
          Already have an account?{' '}
          <Link href="/signin" className="font-semibold text-neutral-900 hover:text-neutral-700">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
