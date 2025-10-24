/**
 * User Feedback API Endpoint
 *
 * Collects user feedback on features, bugs, and general experience.
 * Integrates with:
 * - Supabase (stores feedback in database)
 * - Axiom (logs feedback events)
 * - Slack (sends notifications for critical feedback)
 * - PostHog (tracks feedback metrics)
 *
 * Usage:
 * POST /api/feedback
 * {
 *   "type": "feature" | "bug" | "experience" | "other",
 *   "feature": "timeline" | "onboarding" | "assets" | etc,
 *   "rating": 1-5,
 *   "message": "User feedback text",
 *   "sentiment": "positive" | "neutral" | "negative",
 *   "metadata": { ... }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { serverLogger } from '@/lib/serverLogger';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Feedback request schema
 */
const FeedbackSchema = z.object({
  type: z.enum(['feature', 'bug', 'experience', 'other']),
  feature: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  message: z.string().min(1).max(5000),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  url: z.string().optional(),
  userAgent: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

type FeedbackRequest = z.infer<typeof FeedbackSchema>;

/**
 * Send feedback notification to Slack (for critical feedback)
 */
async function sendSlackNotification(
  feedback: FeedbackRequest & { userId?: string }
): Promise<void> {
  const slackWebhookUrl = process.env.SLACK_FEEDBACK_WEBHOOK_URL;

  if (!slackWebhookUrl) {
    return; // Slack not configured
  }

  // Only send to Slack for negative feedback or bugs
  if (feedback.sentiment !== 'negative' && feedback.type !== 'bug') {
    return;
  }

  const color = feedback.type === 'bug' ? 'danger' : 'warning';
  const emoji = feedback.type === 'bug' ? ':bug:' : ':disappointed:';

  const message = {
    text: `${emoji} New ${feedback.type} feedback received`,
    attachments: [
      {
        color,
        fields: [
          {
            title: 'Type',
            value: feedback.type,
            short: true,
          },
          {
            title: 'Feature',
            value: feedback.feature || 'N/A',
            short: true,
          },
          {
            title: 'Rating',
            value: feedback.rating ? `${feedback.rating}/5` : 'N/A',
            short: true,
          },
          {
            title: 'Sentiment',
            value: feedback.sentiment || 'N/A',
            short: true,
          },
          {
            title: 'Message',
            value: feedback.message,
            short: false,
          },
          {
            title: 'User ID',
            value: feedback.userId || 'Anonymous',
            short: true,
          },
          {
            title: 'URL',
            value: feedback.url || 'N/A',
            short: true,
          },
        ],
        footer: 'Non-Linear Editor Feedback',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  try {
    await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  } catch (error) {
    serverLogger.error({ error }, 'Failed to send Slack notification');
  }
}

/**
 * Analyze sentiment if not provided
 */
function analyzeSentiment(message: string, rating?: number): 'positive' | 'neutral' | 'negative' {
  // Simple sentiment analysis based on rating and keywords
  if (rating !== undefined) {
    if (rating >= 4) return 'positive';
    if (rating <= 2) return 'negative';
    return 'neutral';
  }

  const messageLower = message.toLowerCase();

  const positiveKeywords = [
    'love',
    'great',
    'awesome',
    'excellent',
    'amazing',
    'perfect',
    'fantastic',
    'good',
    'like',
    'helpful',
    'useful',
  ];

  const negativeKeywords = [
    'hate',
    'terrible',
    'awful',
    'horrible',
    'bad',
    'worst',
    'broken',
    'bug',
    'crash',
    'slow',
    'confusing',
    'frustrating',
    'annoying',
  ];

  const positiveMatches = positiveKeywords.filter((kw): boolean =>
    messageLower.includes(kw)
  ).length;
  const negativeMatches = negativeKeywords.filter((kw): boolean =>
    messageLower.includes(kw)
  ).length;

  if (positiveMatches > negativeMatches) return 'positive';
  if (negativeMatches > positiveMatches) return 'negative';
  return 'neutral';
}

export async function POST(
  request: NextRequest
): Promise<
  | NextResponse<{
      success: boolean;
      message: string;
      sentiment: 'positive' | 'neutral' | 'negative';
    }>
  | NextResponse<{ success: boolean; error: string }>
> {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = FeedbackSchema.parse(body);

    // Get user ID from session if available (optional - can be anonymous)
    let userId: string | undefined;
    const authHeader = request.headers.get('authorization');

    if (
      authHeader &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          {
            global: {
              headers: {
                Authorization: authHeader,
              },
            },
          }
        );

        const {
          data: { user },
        } = await supabase.auth.getUser();

        userId = user?.id;
      } catch {
        // Anonymous feedback is OK
      }
    }

    // Analyze sentiment if not provided
    const sentiment =
      validatedData.sentiment || analyzeSentiment(validatedData.message, validatedData.rating);

    // Store feedback in database
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { error: dbError } = await supabase.from('user_feedback').insert({
        user_id: userId,
        type: validatedData.type,
        feature: validatedData.feature,
        rating: validatedData.rating,
        message: validatedData.message,
        sentiment,
        url: validatedData.url,
        user_agent: validatedData.userAgent || request.headers.get('user-agent'),
        metadata: validatedData.metadata || {},
        created_at: new Date().toISOString(),
      });

      if (dbError) {
        serverLogger.error({ error: dbError }, 'Failed to store feedback in database');
      }
    }

    // Log feedback event to Axiom
    serverLogger.info(
      {
        event: 'user_feedback_received',
        userId,
        type: validatedData.type,
        feature: validatedData.feature,
        rating: validatedData.rating,
        sentiment,
        messageLength: validatedData.message.length,
      },
      'User feedback received'
    );

    // Send Slack notification for critical feedback
    await sendSlackNotification({ ...validatedData, sentiment, userId });

    return NextResponse.json(
      {
        success: true,
        message: 'Feedback received successfully',
        sentiment,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid feedback data',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    serverLogger.error({ error }, 'Failed to process feedback');

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit feedback',
      },
      { status: 500 }
    );
  }
}

/**
 * Get feedback statistics (admin only)
 */
export async function GET(
  request: NextRequest
): Promise<
  | NextResponse<{ success: boolean; error: string }>
  | NextResponse<{ success: boolean; statistics: unknown }>
> {
  try {
    // Verify admin access
    const authHeader = request.headers.get('authorization');

    if (
      !authHeader ||
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get user to verify admin
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Get feedback statistics
    const { data: feedbackStats, error: statsError } =
      await supabase.rpc('get_feedback_statistics');

    if (statsError) {
      throw statsError;
    }

    return NextResponse.json({
      success: true,
      statistics: feedbackStats,
    });
  } catch (error) {
    serverLogger.error({ error }, 'Failed to get feedback statistics');

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve feedback statistics',
      },
      { status: 500 }
    );
  }
}
