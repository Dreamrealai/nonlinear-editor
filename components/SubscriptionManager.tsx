/**
 * SubscriptionManager - User subscription and usage tracking dashboard
 *
 * Comprehensive subscription management interface that displays current plan
 * details, usage statistics, and subscription actions. Supports free, premium,
 * and admin tiers with real-time usage tracking and Stripe integration.
 *
 * Features:
 * - Current plan display with tier-specific styling
 * - Real-time usage tracking (video minutes, AI requests, storage)
 * - Visual progress bars with color-coded warnings
 * - Subscription status and renewal date (for premium users)
 * - Stripe Checkout integration for upgrades
 * - Stripe Customer Portal for subscription management
 * - Premium feature highlights for free users
 * - Dark mode support
 * - Responsive layout with gradient decorations
 *
 * Tiers:
 * - Free: Basic limits with upgrade CTA
 * - Premium: Enhanced limits with subscription management
 * - Admin: Unlimited resources with special badge
 *
 * @example
 * ```tsx
 * <SubscriptionManager />
 * ```
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { UserProfile, TIER_LIMITS } from '@/lib/types/subscription';
import { isPostgresNotFound } from '@/lib/errors/errorCodes';
import toast from 'react-hot-toast';
import { browserLogger } from '@/lib/browserLogger';
import { redirectToUrl } from '@/lib/navigation';

export function SubscriptionManager(): React.ReactElement | null {
  const { supabaseClient } = useSupabase();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect((): void => {
    if (!supabaseClient) return;

    const loadProfile = async (): Promise<void> => {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabaseClient
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        browserLogger.error({ error, code: error.code }, 'Error loading profile');
        // Don't show error toast if table doesn't exist (404) - fail silently
        if (!isPostgresNotFound(error) && !error.message.includes('404')) {
          toast.error('Failed to load subscription data');
        }
      } else if (data) {
        setProfile(data);
      }

      setLoading(false);
    };

    loadProfile();
  }, [supabaseClient]);

  const handleUpgrade = async (): Promise<void> => {
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
        redirectToUrl(data.url);
      }
    } catch (error) {
      browserLogger.error({ error }, 'Error upgrading subscription');
      toast.error(error instanceof Error ? error.message : 'Failed to upgrade');
      setActionLoading(false);
    }
  };

  const handleManageSubscription = async (): Promise<void> => {
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
      redirectToUrl(data.url);
    } catch (error) {
      browserLogger.error({ error }, 'Error opening billing portal');
      toast.error(error instanceof Error ? error.message : 'Failed to open billing portal');
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-center gap-3 py-8">
          <div
            className="h-6 w-6 animate-spin rounded-full border-3 border-purple-200 border-t-purple-600 motion-reduce:animate-none motion-reduce:border-t-6 dark:border-purple-800 dark:border-t-purple-400"
            role="status"
            aria-label="Loading subscription"
          ></div>
          <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
            Loading subscription...
          </div>
        </div>
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
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden relative">
        {/* Decorative gradient for premium/admin */}
        {(isPremium || isAdmin) && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        )}

        <div className="relative">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  isAdmin
                    ? 'bg-gradient-to-br from-purple-500 to-purple-600'
                    : isPremium
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                      : 'bg-neutral-200'
                }`}
              >
                {isAdmin ? (
                  <svg
                    className="h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                    />
                  </svg>
                ) : isPremium ? (
                  <svg
                    className="h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5 text-neutral-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                )}
              </div>
              <h2 className="text-xl font-bold text-neutral-900">Current Plan</h2>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide shadow-sm ${
                  isAdmin
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                    : isPremium
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                      : 'bg-neutral-100 text-neutral-700'
                }`}
              >
                {profile.tier}
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {tierLimits.features.map(
              (feature): React.ReactElement => (
                <div key={feature} className="flex items-center gap-3 text-sm text-neutral-700">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                    <svg
                      className="h-3 w-3 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="font-medium">{feature}</span>
                </div>
              )
            )}
          </div>

          {isPremium && profile.subscription_status && (
            <div className="mt-5 pt-5 border-t border-neutral-200">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      profile.subscription_status === 'active'
                        ? 'bg-green-500'
                        : profile.subscription_status === 'trialing'
                          ? 'bg-blue-500'
                          : 'bg-neutral-400'
                    }`}
                  ></div>
                  <span className="text-neutral-600">Status:</span>
                  <span className="font-semibold text-neutral-900 capitalize">
                    {profile.subscription_status}
                  </span>
                </div>
              </div>
              {profile.subscription_current_period_end && (
                <div className="mt-2 text-sm text-neutral-600">
                  <span className="inline-flex items-center gap-1.5">
                    <svg
                      className="h-4 w-4 text-neutral-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {profile.subscription_cancel_at_period_end ? 'Ends' : 'Renews'} on{' '}
                    <span className="font-semibold text-neutral-900">
                      {new Date(profile.subscription_current_period_end).toLocaleDateString(
                        'en-US',
                        {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        }
                      )}
                    </span>
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="mt-6">
            {isFree && (
              <button
                onClick={handleUpgrade}
                disabled={actionLoading}
                className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-sm font-bold text-white shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-md transition-all duration-200"
              >
                {actionLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Loading...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                      />
                    </svg>
                    Upgrade to Premium - ${tierLimits.price}/month
                  </span>
                )}
              </button>
            )}

            {isPremium && (
              <button
                onClick={handleManageSubscription}
                disabled={actionLoading}
                className="w-full rounded-lg bg-gradient-to-r from-neutral-900 to-neutral-700 px-4 py-3 text-sm font-bold text-white shadow-md hover:shadow-lg hover:from-neutral-800 hover:to-neutral-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-md transition-all duration-200"
              >
                {actionLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Loading...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Manage Subscription
                  </span>
                )}
              </button>
            )}

            {isAdmin && (
              <div className="text-center rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 p-4 border border-purple-200">
                <div className="flex items-center justify-center gap-2 text-sm font-semibold text-purple-900">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  You have admin access with unlimited resources
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
            <svg
              className="h-5 w-5 text-indigo-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-neutral-900">Usage This Month</h2>
        </div>

        <div className="space-y-6">
          {/* Video Minutes */}
          <div className="group">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                  <svg
                    className="h-4 w-4 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-neutral-700">Video Minutes</span>
              </div>
              <span className="text-sm font-bold text-neutral-900">
                {profile.video_minutes_used} / {profile.video_minutes_limit} min
              </span>
            </div>
            <div className="relative h-3 w-full rounded-full bg-neutral-100 overflow-hidden shadow-inner">
              <div
                className={`h-3 rounded-full transition-all duration-500 ease-out ${
                  videoPercentage >= 90
                    ? 'bg-gradient-to-r from-red-500 to-red-600'
                    : videoPercentage >= 70
                      ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                      : 'bg-gradient-to-r from-green-500 to-green-600'
                }`}
                style={{ width: `${Math.min(videoPercentage, 100)}%` }}
              />
            </div>
            {videoPercentage >= 90 && (
              <p className="mt-2 text-xs text-red-600 font-medium">
                You&apos;re running low on video minutes
              </p>
            )}
          </div>

          {/* AI Requests */}
          <div className="group">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50">
                  <svg
                    className="h-4 w-4 text-purple-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-neutral-700">AI Requests</span>
              </div>
              <span className="text-sm font-bold text-neutral-900">
                {profile.ai_requests_used} / {profile.ai_requests_limit}
              </span>
            </div>
            <div className="relative h-3 w-full rounded-full bg-neutral-100 overflow-hidden shadow-inner">
              <div
                className={`h-3 rounded-full transition-all duration-500 ease-out ${
                  aiPercentage >= 90
                    ? 'bg-gradient-to-r from-red-500 to-red-600'
                    : aiPercentage >= 70
                      ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                      : 'bg-gradient-to-r from-purple-500 to-purple-600'
                }`}
                style={{ width: `${Math.min(aiPercentage, 100)}%` }}
              />
            </div>
            {aiPercentage >= 90 && (
              <p className="mt-2 text-xs text-red-600 font-medium">
                You&apos;re running low on AI requests
              </p>
            )}
          </div>

          {/* Storage */}
          <div className="group">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50">
                  <svg
                    className="h-4 w-4 text-orange-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                    />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-neutral-700">Storage</span>
              </div>
              <span className="text-sm font-bold text-neutral-900">
                {profile.storage_gb_used.toFixed(2)} / {profile.storage_gb_limit} GB
              </span>
            </div>
            <div className="relative h-3 w-full rounded-full bg-neutral-100 overflow-hidden shadow-inner">
              <div
                className={`h-3 rounded-full transition-all duration-500 ease-out ${
                  storagePercentage >= 90
                    ? 'bg-gradient-to-r from-red-500 to-red-600'
                    : storagePercentage >= 70
                      ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                      : 'bg-gradient-to-r from-orange-500 to-orange-600'
                }`}
                style={{ width: `${Math.min(storagePercentage, 100)}%` }}
              />
            </div>
            {storagePercentage >= 90 && (
              <p className="mt-2 text-xs text-red-600 font-medium">
                You&apos;re running low on storage space
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2 rounded-lg bg-neutral-50 px-4 py-3 border border-neutral-200">
          <svg
            className="h-4 w-4 text-neutral-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-xs font-medium text-neutral-600">
            Usage resets on{' '}
            <span className="font-semibold text-neutral-900">
              {new Date(profile.usage_reset_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </span>
        </div>
      </div>

      {/* Premium Features */}
      {isFree && (
        <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden relative">
          {/* Decorative gradient */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl -mr-20 -mt-20"></div>

          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-blue-900">Upgrade to Premium</h3>
                <p className="text-sm text-blue-700">Unlock powerful features and higher limits</p>
              </div>
            </div>

            <ul className="space-y-3 mb-5">
              {TIER_LIMITS.premium.features.map(
                (feature): React.ReactElement => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-blue-900">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-200">
                      <svg
                        className="h-3 w-3 text-blue-700"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <span className="font-medium">{feature}</span>
                  </li>
                )
              )}
            </ul>

            <button
              onClick={handleUpgrade}
              disabled={actionLoading}
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-lg transition-all duration-200"
            >
              {actionLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Loading...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                  Get Premium Now
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
