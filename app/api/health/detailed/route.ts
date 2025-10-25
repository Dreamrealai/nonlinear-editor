/**
 * Detailed Health Check Endpoint
 *
 * Provides comprehensive health status for all system components:
 * - Database connectivity (Supabase)
 * - External services (Axiom, PostHog, Sentry)
 * - Feature health checks
 * - System resources
 *
 * IMPORTANT: This endpoint requires admin authentication due to sensitive system information.
 * For public health checks, use /api/health instead.
 *
 * Used by:
 * - Internal dashboards (admin only)
 * - Monitoring systems (with admin credentials)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { serverLogger } from '@/lib/serverLogger';
import { withAdminAuth } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  latency?: number;
  details?: Record<string, unknown>;
}

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  checks: {
    database: HealthCheck;
    supabase: HealthCheck;
    axiom: HealthCheck;
    posthog: HealthCheck;
    redis: HealthCheck;
  };
  features: {
    onboarding: HealthCheck;
    timeline: HealthCheck;
    assets: HealthCheck;
    backup: HealthCheck;
    analytics: HealthCheck;
  };
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    uptime: number;
  };
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return {
        status: 'unhealthy',
        message: 'Supabase credentials not configured',
      };
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Simple query to test connectivity
    const { error } = await supabase.from('user_profiles').select('count').limit(1).single();

    const latency = Date.now() - start;

    if (error && !error.message.includes('multiple')) {
      return {
        status: 'unhealthy',
        message: `Database error: ${error.message}`,
        latency,
      };
    }

    // Warn if latency is high
    if (latency > 1000) {
      return {
        status: 'degraded',
        message: 'High database latency',
        latency,
      };
    }

    return {
      status: 'healthy',
      latency,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Database check failed',
      latency: Date.now() - start,
    };
  }
}

/**
 * Check Supabase storage
 */
async function checkSupabase(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return {
        status: 'unhealthy',
        message: 'Supabase credentials not configured',
      };
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Check storage bucket exists
    const { data, error } = await supabase.storage.listBuckets();

    const latency = Date.now() - start;

    if (error) {
      return {
        status: 'unhealthy',
        message: `Supabase storage error: ${error.message}`,
        latency,
      };
    }

    const hasAssetBucket = data?.some((bucket): boolean => bucket.name === 'assets');

    if (!hasAssetBucket) {
      return {
        status: 'degraded',
        message: 'Assets bucket not found',
        latency,
      };
    }

    return {
      status: 'healthy',
      latency,
      details: {
        buckets: data?.length || 0,
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Supabase check failed',
      latency: Date.now() - start,
    };
  }
}

/**
 * Check Axiom logging service
 */
async function checkAxiom(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    if (!process.env.AXIOM_TOKEN || !process.env.AXIOM_DATASET) {
      return {
        status: 'degraded',
        message: 'Axiom not configured (logging disabled)',
      };
    }

    // Axiom is a best-effort service, so we just check configuration
    return {
      status: 'healthy',
      latency: Date.now() - start,
      details: {
        dataset: process.env.AXIOM_DATASET,
      },
    };
  } catch (error) {
    return {
      status: 'degraded',
      message: error instanceof Error ? error.message : 'Axiom check failed',
      latency: Date.now() - start,
    };
  }
}

/**
 * Check PostHog analytics service
 */
async function checkPostHog(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || !process.env.NEXT_PUBLIC_POSTHOG_HOST) {
      return {
        status: 'degraded',
        message: 'PostHog not configured (analytics disabled)',
      };
    }

    // PostHog is client-side, so we just check configuration
    return {
      status: 'healthy',
      latency: Date.now() - start,
      details: {
        host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      },
    };
  } catch (error) {
    return {
      status: 'degraded',
      message: error instanceof Error ? error.message : 'PostHog check failed',
      latency: Date.now() - start,
    };
  }
}

/**
 * Check Redis cache (if configured)
 */
async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    // Redis is optional, so if not configured, it's not an error
    if (!process.env.REDIS_URL) {
      return {
        status: 'healthy',
        message: 'Redis not configured (caching disabled)',
      };
    }

    // TODO: Add actual Redis health check when Redis is implemented
    return {
      status: 'healthy',
      latency: Date.now() - start,
      message: 'Redis configured but not yet implemented',
    };
  } catch (error) {
    return {
      status: 'degraded',
      message: error instanceof Error ? error.message : 'Redis check failed',
      latency: Date.now() - start,
    };
  }
}

/**
 * Check onboarding system health
 */
async function checkOnboardingSystem(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return {
        status: 'unhealthy',
        message: 'Database not configured',
      };
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Check if user_preferences table is accessible (used for onboarding state)
    const { error } = await supabase.from('user_preferences').select('count').limit(1);

    const latency = Date.now() - start;

    if (error && !error.message.includes('JWT')) {
      return {
        status: 'degraded',
        message: `Onboarding system error: ${error.message}`,
        latency,
      };
    }

    return {
      status: 'healthy',
      latency,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Onboarding check failed',
      latency: Date.now() - start,
    };
  }
}

/**
 * Check timeline features
 */
async function checkTimelineFeatures(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    // Timeline is client-side, so we check if projects table is accessible
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return {
        status: 'unhealthy',
        message: 'Database not configured',
      };
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { error } = await supabase.from('projects').select('count').limit(1);

    const latency = Date.now() - start;

    if (error && !error.message.includes('JWT')) {
      return {
        status: 'degraded',
        message: `Timeline system error: ${error.message}`,
        latency,
      };
    }

    return {
      status: 'healthy',
      latency,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Timeline check failed',
      latency: Date.now() - start,
    };
  }
}

/**
 * Check asset system (upload, storage, processing)
 */
async function checkAssetSystem(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return {
        status: 'unhealthy',
        message: 'Storage not configured',
      };
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Check if assets table and storage are accessible
    const { error: dbError } = await supabase.from('assets').select('count').limit(1);

    if (dbError && !dbError.message.includes('JWT')) {
      return {
        status: 'degraded',
        message: `Asset database error: ${dbError.message}`,
        latency: Date.now() - start,
      };
    }

    const { data: buckets, error: storageError } = await supabase.storage.listBuckets();

    if (storageError) {
      return {
        status: 'degraded',
        message: `Asset storage error: ${storageError.message}`,
        latency: Date.now() - start,
      };
    }

    const hasAssetBucket = buckets?.some((bucket): boolean => bucket.name === 'assets');

    if (!hasAssetBucket) {
      return {
        status: 'degraded',
        message: 'Assets bucket not found',
        latency: Date.now() - start,
      };
    }

    return {
      status: 'healthy',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Asset system check failed',
      latency: Date.now() - start,
    };
  }
}

/**
 * Check backup system
 */
async function checkBackupSystem(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    // Backup system relies on database and storage
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return {
        status: 'unhealthy',
        message: 'Backup dependencies not configured',
      };
    }

    // Check if project_versions table exists (used for backups)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { error } = await supabase.from('project_versions').select('count').limit(1);

    const latency = Date.now() - start;

    if (error && !error.message.includes('JWT')) {
      return {
        status: 'degraded',
        message: `Backup system error: ${error.message}`,
        latency,
      };
    }

    return {
      status: 'healthy',
      latency,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Backup system check failed',
      latency: Date.now() - start,
    };
  }
}

/**
 * Check analytics system
 */
async function checkAnalyticsSystem(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    const hasPostHog = process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NEXT_PUBLIC_POSTHOG_HOST;
    const hasAxiom = process.env.AXIOM_TOKEN && process.env.AXIOM_DATASET;

    if (!hasPostHog && !hasAxiom) {
      return {
        status: 'degraded',
        message: 'No analytics services configured',
        latency: Date.now() - start,
      };
    }

    return {
      status: 'healthy',
      latency: Date.now() - start,
      details: {
        posthog: hasPostHog,
        axiom: hasAxiom,
      },
    };
  } catch (error) {
    return {
      status: 'degraded',
      message: error instanceof Error ? error.message : 'Analytics check failed',
      latency: Date.now() - start,
    };
  }
}

/**
 * Get overall health status from individual checks
 */
function getOverallStatus(
  checks: HealthCheckResult['checks'],
  features: HealthCheckResult['features']
): 'healthy' | 'degraded' | 'unhealthy' {
  const allStatuses = [...Object.values(checks), ...Object.values(features)].map(
    (c): 'healthy' | 'degraded' | 'unhealthy' => c.status
  );

  if (allStatuses.includes('unhealthy')) {
    return 'unhealthy';
  }

  if (allStatuses.includes('degraded')) {
    return 'degraded';
  }

  return 'healthy';
}

export const GET = withAdminAuth(
  async (): Promise<
    | NextResponse<HealthCheckResult>
    | NextResponse<{ status: string; timestamp: string; error: string }>
  > => {
    const start = Date.now();

    try {
      // Run all health checks in parallel
      const [database, supabase, axiom, posthog, redis] = await Promise.all([
        checkDatabase(),
        checkSupabase(),
        checkAxiom(),
        checkPostHog(),
        checkRedis(),
      ]);

      const [onboarding, timeline, assets, backup, analytics] = await Promise.all([
        checkOnboardingSystem(),
        checkTimelineFeatures(),
        checkAssetSystem(),
        checkBackupSystem(),
        checkAnalyticsSystem(),
      ]);

      const checks = { database, supabase, axiom, posthog, redis };
      const features = { onboarding, timeline, assets, backup, analytics };

      const healthData: HealthCheckResult = {
        status: getOverallStatus(checks, features),
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'unknown',
        version: process.env.npm_package_version || 'unknown',
        checks,
        features,
        system: {
          memory: {
            used: process.memoryUsage().heapUsed,
            total: process.memoryUsage().heapTotal,
            percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
          },
          uptime: process.uptime(),
        },
      };

      const totalLatency = Date.now() - start;

      // Log health check results
      serverLogger.info(
        {
          status: healthData.status,
          latency: totalLatency,
          checks: Object.fromEntries(
            Object.entries(healthData.checks).map(
              ([key, value]): [string, 'healthy' | 'degraded' | 'unhealthy'] => [key, value.status]
            )
          ),
          features: Object.fromEntries(
            Object.entries(healthData.features).map(
              ([key, value]): [string, 'healthy' | 'degraded' | 'unhealthy'] => [key, value.status]
            )
          ),
        },
        'Health check completed'
      );

      // Return appropriate status code based on health
      const statusCode =
        healthData.status === 'healthy' ? 200 : healthData.status === 'degraded' ? 207 : 503;

      return NextResponse.json(healthData, { status: statusCode });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      serverLogger.error({ error }, 'Health check failed');

      return NextResponse.json(
        {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: errorMessage,
        },
        { status: 503 }
      );
    }
  },
  {
    route: '/api/health/detailed',
    rateLimit: RATE_LIMITS.tier3_status_read, // 30 requests per minute for status checks
  }
);
