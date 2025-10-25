'use client';

import { useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function ResendEmailPage(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess('Confirmation email sent.');
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-medium">Resend confirmation email</h3>
        <p className="text-sm text-gray-500">
          Enter your email address to receive a new confirmation link.
        </p>
      </div>

      <form onSubmit={handleResendEmail} className="space-y-6">
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
        {success && <p className="text-sm text-green-600">{success}</p>}

        <div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Sending...' : 'Resend email'}
          </Button>
        </div>
      </form>
    </div>
  );
}
