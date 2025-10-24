/**
 * SignInPage Component
 *
 * User authentication page with email/password or guest access
 * - Email/password sign in
 * - Anonymous guest access
 * - Password visibility toggle
 * - Redirect to home on success
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingGuest, setIsLoadingGuest] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [supabaseConfigured, setSupabaseConfigured] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="max-w-md rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Supabase Not Configured</h1>
          <p className="mt-4 text-neutral-600 dark:text-neutral-400">
            Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables to
            enable authentication.
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

    setIsLoading(true);

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
      setIsLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setIsLoadingGuest(true);
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
      setIsLoadingGuest(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Sign in to Editor</CardTitle>
          <CardDescription>Welcome back! Please enter your details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSignIn}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium">
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
                  disabled={isLoading || isLoadingGuest}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="password" className="block text-sm font-medium">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading || isLoadingGuest}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                    disabled={isLoading || isLoadingGuest}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Authentication Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert variant="success">
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={isLoading || isLoadingGuest} className="w-full">
              {isLoading ? <LoadingSpinner size={20} /> : 'Sign In'}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-background px-2 text-muted-foreground">Or continue as</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleAnonymousSignIn}
            disabled={isLoading || isLoadingGuest}
            className="w-full"
          >
            {isLoadingGuest ? <LoadingSpinner size={20} /> : 'Continue as Guest'}
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          <p>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
