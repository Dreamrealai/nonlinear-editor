'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';

export default function LogoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogout = async () => {
    setLoading(true);
    setError('');

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push('/auth/sign-in');
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-medium">Sign out</h3>
        <p className="text-sm text-gray-500">Are you sure you want to sign out?</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-4">
        <Button variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleLogout} disabled={loading}>
          {loading ? 'Signing out...' : 'Sign out'}
        </Button>
      </div>
    </div>
  );
}
