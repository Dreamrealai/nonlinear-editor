'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { UserProfile, UserTier } from '@/lib/types/subscription';
import toast, { Toaster } from 'react-hot-toast';

export default function AdminDashboard() {
  const router = useRouter();
  const { supabaseClient } = useSupabase();
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseClient) return;

    const loadData = async () => {
      try {
        // Get current user
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !user) {
          router.push('/signin');
          return;
        }

        // Get current user's profile
        const { data: profile, error: profileError } = await supabaseClient
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          toast.error('Failed to load profile');
          router.push('/');
          return;
        }

        // Check if user is admin
        if (profile.tier !== 'admin') {
          toast.error('Access denied. Admin privileges required.');
          router.push('/');
          return;
        }

        setCurrentUserProfile(profile);

        // Load all users
        const { data: allUsers, error: usersError } = await supabaseClient
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (usersError) {
          console.error('Error fetching users:', usersError);
          toast.error('Failed to load users');
        } else {
          setUsers(allUsers);
        }
      } catch (error) {
        console.error('Error loading admin data:', error);
        toast.error('Failed to load admin dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [supabaseClient, router]);

  const handleChangeTier = async (userId: string, newTier: UserTier) => {
    if (!supabaseClient) return;

    setActionLoading(userId);
    try {
      const response = await fetch('/api/admin/change-tier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, tier: newTier }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change tier');
      }

      // Reload users
      const { data: allUsers, error: usersError } = await supabaseClient
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!usersError) {
        setUsers(allUsers);
      }

      toast.success(`User tier changed to ${newTier}`);
    } catch (error) {
      console.error('Error changing tier:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to change tier');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!supabaseClient) return;

    const confirmed = confirm(
      `Are you sure you want to delete ${userEmail}? This will permanently delete all their data and cannot be undone.`
    );

    if (!confirmed) return;

    setActionLoading(userId);
    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      // Remove user from local state
      setUsers(users.filter(u => u.id !== userId));

      toast.success('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="text-neutral-600">Loading admin dashboard...</div>
      </div>
    );
  }

  if (!currentUserProfile || currentUserProfile.tier !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="text-red-600">Access denied. Admin privileges required.</div>
      </div>
    );
  }

  const stats = {
    total: users.length,
    free: users.filter(u => u.tier === 'free').length,
    premium: users.filter(u => u.tier === 'premium').length,
    admin: users.filter(u => u.tier === 'admin').length,
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <Toaster position="bottom-right" />
      <div className="mx-auto max-w-7xl">
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
          <h1 className="text-3xl font-bold text-neutral-900">DreamReal Admin Dashboard</h1>
          <p className="mt-2 text-neutral-600">Manage users and subscriptions</p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-medium text-neutral-600">Total Users</div>
            <div className="mt-2 text-3xl font-bold text-neutral-900">{stats.total}</div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-medium text-neutral-600">Free Users</div>
            <div className="mt-2 text-3xl font-bold text-neutral-900">{stats.free}</div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-medium text-neutral-600">Premium Users</div>
            <div className="mt-2 text-3xl font-bold text-blue-900">{stats.premium}</div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-medium text-neutral-600">Admin Users</div>
            <div className="mt-2 text-3xl font-bold text-purple-900">{stats.admin}</div>
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 px-6 py-4">
            <h2 className="text-xl font-semibold text-neutral-900">All Users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-700">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-700">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-700">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-700">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-neutral-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-900">
                      {user.email}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        user.tier === 'admin' ? 'bg-purple-100 text-purple-900' :
                        user.tier === 'premium' ? 'bg-blue-100 text-blue-900' :
                        'bg-neutral-100 text-neutral-900'
                      }`}>
                        {user.tier.toUpperCase()}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-xs text-neutral-600">
                      <div>{user.video_minutes_used}/{user.video_minutes_limit} min</div>
                      <div>{user.ai_requests_used}/{user.ai_requests_limit} AI</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-600">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <select
                          value={user.tier}
                          onChange={(e) => handleChangeTier(user.id, e.target.value as UserTier)}
                          disabled={actionLoading === user.id || user.id === currentUserProfile.id}
                          className="rounded-lg border border-neutral-300 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="free">Free</option>
                          <option value="premium">Premium</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          disabled={actionLoading === user.id || user.id === currentUserProfile.id}
                          className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionLoading === user.id ? 'Processing...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
