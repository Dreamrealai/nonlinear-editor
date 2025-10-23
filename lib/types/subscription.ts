// =============================================================================
// Subscription and User Profile Types
// =============================================================================

export type UserTier = 'free' | 'premium' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  tier: UserTier;

  // Stripe subscription data
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  subscription_status: string | null;
  subscription_current_period_start: string | null;
  subscription_current_period_end: string | null;
  subscription_cancel_at_period_end: boolean;

  // Usage limits
  video_minutes_limit: number;
  ai_requests_limit: number;
  storage_gb_limit: number;

  // Current usage
  video_minutes_used: number;
  ai_requests_used: number;
  storage_gb_used: number;

  // Reset tracking
  usage_reset_at: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface SubscriptionHistory {
  id: string;
  user_id: string;
  previous_tier: UserTier | null;
  new_tier: UserTier;
  changed_by: string | null;
  change_reason: string | null;
  stripe_event_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
}

export interface UsageTracking {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  video_minutes_used: number;
  ai_requests_used: number;
  storage_gb_used: number;
  video_minutes_limit: number;
  ai_requests_limit: number;
  storage_gb_limit: number;
  created_at: string;
}

export interface TierLimits {
  videoMinutes: number;
  aiRequests: number;
  storageGB: number;
  price: number;
  features: string[];
}

export const TIER_LIMITS: Record<UserTier, TierLimits> = {
  free: {
    videoMinutes: 10,
    aiRequests: 50,
    storageGB: 5,
    price: 0,
    features: [
      '10 video minutes per month',
      '50 AI requests per month',
      '5 GB storage',
      'Basic editing tools',
    ],
  },
  premium: {
    videoMinutes: 500,
    aiRequests: 2000,
    storageGB: 100,
    price: 49,
    features: [
      '500 video minutes per month',
      '2,000 AI requests per month',
      '100 GB storage',
      'Advanced AI features',
      'Priority support',
      'HD export quality',
    ],
  },
  admin: {
    videoMinutes: 999999,
    aiRequests: 999999,
    storageGB: 1000,
    price: 0,
    features: [
      'Unlimited video minutes',
      'Unlimited AI requests',
      '1 TB storage',
      'Admin dashboard access',
      'User management',
    ],
  },
};

export interface StripeCheckoutRequest {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface StripeCheckoutResponse {
  sessionId: string;
  url: string;
}

export interface StripePortalResponse {
  url: string;
}
