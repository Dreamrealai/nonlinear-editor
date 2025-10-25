/**
 * Health Check Endpoint
 * Used by Docker healthcheck and monitoring services
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<
  | NextResponse<{
      status: string;
      timestamp: string;
      uptime: number;
      environment: 'development' | 'production' | 'test';
      version: string;
    }>
  | NextResponse<{ status: string; timestamp: string; error: string }>
> {
  try {
    // Basic health check
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || 'unknown',
    };

    return NextResponse.json(healthData, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
