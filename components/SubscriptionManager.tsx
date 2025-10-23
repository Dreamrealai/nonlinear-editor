'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { UserProfile, TIER_LIMITS } from '@/lib/types/subscription';
import toast from 'react-hot-toast';

export function SubscriptionManager() {
  const { supabaseClient } = useSupabase();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!supabaseClient) return;

    const loadProfile = async () => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;

      const { data, error } = await supabaseClient
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        toast.error('Failed to load subscription data');
      } else {
        setProfile(data);
      }

      setLoading(false);
    };

    loadProfile();
  }, [supabaseClient]);

  const handleUpgrade = async () => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout URL
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error upgrading:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upgrade');
      setActionLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open billing portal');
      }

      // Redirect to Stripe Customer Portal
      window.location.href = data.url;
    } catch (error) {
      console.error('Error opening portal:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to open billing portal');
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="text-neutral-600">Loading subscription...</div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const tierLimits = TIER_LIMITS[profile.tier];
  const isAdmin = profile.tier === 'admin';
  const isPremium = profile.tier === 'premium';
  const isFree = profile.tier === 'free';

  const videoPercentage = (profile.video_minutes_used / profile.video_minutes_limit) * 100;
  const aiPercentage = (profile.ai_requests_used / profile.ai_requests_limit) * 100;
  const storagePercentage = (profile.storage_gb_used / profile.storage_gb_limit) * 100;

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-neutral-900">Current Plan</h2>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${
              isAdmin ? 'bg-purple-100 text-purple-900' :
              isPremium ? 'bg-blue-100 text-blue-900' :
              'bg-neutral-100 text-neutral-900'
            }`}>
              {profile.tier.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {tierLimits.features.map((feature, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-neutral-700">
              <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {feature}
            </div>
          ))}
        </div>

        {isPremium && profile.subscription_status && (
          <div className="mt-4 pt-4 border-t border-neutral-200">
            <div className="text-sm text-neutral-600">
              <p>Status: <span className="font-medium text-neutral-900">{profile.subscription_status}</span></p>
              {profile.subscription_current_period_end && (
                <p className="mt-1">
                  {profile.subscription_cancel_at_period_end ? 'Ends' : 'Renews'} on:{' '}
                  <span className="font-medium text-neutral-900">
                    {new Date(profile.subscription_current_period_end).toLocaleDateString()}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mt-6">
          {isFree && (
            <button
              onClick={handleUpgrade}
              disabled={actionLoading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading ? 'Loading...' : `Upgrade to Premium - $${tierLimits.price}/month`}
            </button>
          )}

          {isPremium && (
            <button
              onClick={handleManageSubscription}
              disabled={actionLoading}
              className="w-full rounded-lg bg-neutral-900 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading ? 'Loading...' : 'Manage Subscription'}
            </button>
          )}

          {isAdmin && (
            <div className="text-center text-sm text-neutral-600">
              You have admin access with unlimited resources.
            </div>
          )}
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-neutral-900">Usage This Month</h2>

        <div className="space-y-4">
          {/* Video Minutes */}
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium text-neutral-700">Video Minutes</span>
              <span className="text-neutral-900">
                {profile.video_minutes_used} / {profile.video_minutes_limit} min
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-neutral-200">
              <div
                className={`h-2 rounded-full transition-all ${
                  videoPercentage >= 90 ? 'bg-red-600' :
                  videoPercentage >= 70 ? 'bg-yellow-600' :
                  'bg-green-600'
                }`}
                style={{ width: `${Math.min(videoPercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* AI Requests */}
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium text-neutral-700">AI Requests</span>
              <span className="text-neutral-900">
                {profile.ai_requests_used} / {profile.ai_requests_limit}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-neutral-200">
              <div
                className={`h-2 rounded-full transition-all ${
                  aiPercentage >= 90 ? 'bg-red-600' :
                  aiPercentage >= 70 ? 'bg-yellow-600' :
                  'bg-green-600'
                }`}
                style={{ width: `${Math.min(aiPercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Storage */}
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium text-neutral-700">Storage</span>
              <span className="text-neutral-900">
                {profile.storage_gb_used.toFixed(2)} / {profile.storage_gb_limit} GB
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-neutral-200">
              <div
                className={`h-2 rounded-full transition-all ${
                  storagePercentage >= 90 ? 'bg-red-600' :
                  storagePercentage >= 70 ? 'bg-yellow-600' :
                  'bg-green-600'
                }`}
                style={{ width: `${Math.min(storagePercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs text-neutral-500">
          Usage resets on {new Date(profile.usage_reset_at).toLocaleDateString()}
        </div>
      </div>

      {/* Premium Features */}
      {isFree && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <h3 className="mb-3 text-lg font-semibold text-blue-900">Upgrade to Premium</h3>
          <ul className="space-y-2">
            {TIER_LIMITS.premium.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-blue-800">
                <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
          <button
            onClick={handleUpgrade}
            disabled={actionLoading}
            className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Get Premium Now
          </button>
        </div>
      )}
    </div>
  );
}
