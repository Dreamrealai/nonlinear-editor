'use client';

import { useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-medium">Forgot your password?</h3>
        <p className="text-sm text-gray-500">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      {success ? (
        <div className="text-sm text-green-600">
          <p>Password reset link sent. Please check your email.</p>
        </div>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-6">
          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send reset link'}
            </Button>
          </div>
        </form>
      )}

      <div className="text-sm text-center">
        <p className="text-gray-500">
          <Link href="/auth/sign-in" className="font-medium text-indigo-600 hover:text-indigo-500">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
