/**
 * API Documentation Route
 *
 * Serves the OpenAPI specification and provides a Swagger UI interface
 * for interactive API documentation.
 *
 * @route GET /api/docs
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { withErrorHandling, internalServerError } from '@/lib/api/response';
import { serverLogger } from '@/lib/serverLogger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/docs
 *
 * Returns the OpenAPI specification in JSON or YAML format.
 * Add ?format=yaml query parameter to get YAML format.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';

  serverLogger.debug(
    {
      event: 'docs.request',
      format,
    },
    'API documentation requested'
  );

  // Read OpenAPI spec file
  const specPath = join(process.cwd(), 'docs', 'api', 'openapi.yaml');
  let yamlContent: string;

  try {
    yamlContent = readFileSync(specPath, 'utf-8');
  } catch (error) {
    serverLogger.error(
      {
        event: 'docs.file_read_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        specPath,
      },
      'Failed to read OpenAPI spec file'
    );
    return internalServerError('Failed to load API documentation', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

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
  try {
    const yaml = await import('yaml');
    const jsonContent = yaml.parse(yamlContent);

    return NextResponse.json(jsonContent, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    serverLogger.error(
      {
        event: 'docs.yaml_parse_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Failed to parse YAML spec'
    );
    return internalServerError('Failed to parse API documentation', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
