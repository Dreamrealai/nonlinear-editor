/**
 * Web Vitals Analytics Endpoint
 *
 * Receives Web Vitals metrics from the client and logs them for analysis.
 * This endpoint is called via navigator.sendBeacon() from the client.
 *
 * Metrics tracked:
 * - CLS: Cumulative Layout Shift
 * - FCP: First Contentful Paint
 * - LCP: Largest Contentful Paint
 * - TTFB: Time to First Byte
 * - INP: Interaction to Next Paint
 */

import { NextRequest, NextResponse } from 'next/server';
import { serverLogger } from '@/lib/serverLogger';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';

/**
 * Web Vitals metric data
 */
interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  id: string;
  delta: number;
  navigationType?: string;
}

/**
 * POST /api/analytics/web-vitals
 *
 * Receives Web Vitals metrics from the client.
 * Called via navigator.sendBeacon() which sends data as text/plain.
 *
 * Security:
 * - No authentication required (public metrics endpoint)
 * - Rate limited to prevent abuse
 * - Input validation to ensure data integrity
 *
 * @param request - NextRequest with Web Vitals metric data
 * @returns 204 No Content on success, 400 on validation error
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting to prevent abuse (use IP-based limiting for public endpoint)
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimitResult = await checkRateLimit(`web-vitals:${ip}`, RATE_LIMITS.tier4_general);

    if (!rateLimitResult.success) {
      serverLogger.warn(
        { ip, limit: rateLimitResult.limit },
        'Web vitals rate limit exceeded'
      );
      // Return 204 anyway to avoid client-side errors (metrics are non-critical)
      return new NextResponse(null, { status: 204 });
    }

    // Parse the request body (sendBeacon sends as text/plain)
    const text = await request.text();

    // Handle empty body
    if (!text) {
      return new NextResponse(null, { status: 204 });
    }

    // Parse JSON
    const data = JSON.parse(text) as WebVitalMetric;

    // Validate required fields
    if (!data.name || typeof data.value !== 'number' || !data.rating) {
      serverLogger.warn(
        { receivedData: data },
        'Invalid web vitals data received'
      );
      return NextResponse.json(
        { error: 'Invalid metric data' },
        { status: 400 }
      );
    }

    // Log for monitoring
    const logMethod = data.rating === 'poor' ? 'warn' : 'info';
    serverLogger[logMethod](
      {
        metric: data.name,
        value: data.value,
        rating: data.rating,
        navigationType: data.navigationType,
      },
      `Web Vital - ${data.name}: ${data.value.toFixed(2)} (${data.rating})`
    );

    // Return 204 No Content (standard for sendBeacon endpoints)
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    // Log error but don't expose details to client
    serverLogger.error({ error }, 'Error processing web vitals metric');

    // Return 204 anyway to avoid client-side errors
    // Web Vitals tracking is non-critical and should fail silently
    return new NextResponse(null, { status: 204 });
  }
}

/**
 * GET /api/analytics/web-vitals
 *
 * Returns 405 Method Not Allowed.
 * This endpoint only accepts POST requests.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
