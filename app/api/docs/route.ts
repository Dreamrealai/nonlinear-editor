/**
 * API Documentation Route
 *
 * Serves the OpenAPI specification and provides a Swagger UI interface
 * for interactive API documentation.
 *
 * @route GET /api/docs
 */

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

/**
 * GET /api/docs
 *
 * Returns the OpenAPI specification in JSON or YAML format.
 * Add ?format=yaml query parameter to get YAML format.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';

  try {
    // Read OpenAPI spec file
    const specPath = join(process.cwd(), 'docs', 'api', 'openapi.yaml');
    const yamlContent = readFileSync(specPath, 'utf-8');

    if (format === 'yaml') {
      return new NextResponse(yamlContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/x-yaml',
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        },
      });
    }

    // Convert YAML to JSON for JSON format
    const yaml = await import('yaml');
    const jsonContent = yaml.parse(yamlContent);

    return NextResponse.json(jsonContent, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to load API documentation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
