/**
 * API Documentation Page
 *
 * Interactive API documentation using Swagger UI.
 * Displays the OpenAPI specification with a user-friendly interface.
 */

'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function APIDocsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">API Documentation</h1>
          <p className="mt-2 text-sm text-gray-600">
            Interactive documentation for the Non-Linear Video Editor API
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          <SwaggerUI
            url="/api/docs"
            docExpansion="list"
            defaultModelsExpandDepth={1}
            displayRequestDuration={true}
            filter={true}
            showExtensions={true}
            tryItOutEnabled={true}
            persistAuthorization={true}
          />
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Links</h2>
          <ul className="space-y-2">
            <li>
              <a
                href="/api/docs?format=yaml"
                className="text-blue-600 hover:text-blue-800 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Download OpenAPI Spec (YAML)
              </a>
            </li>
            <li>
              <a
                href="/api/docs?format=json"
                className="text-blue-600 hover:text-blue-800 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Download OpenAPI Spec (JSON)
              </a>
            </li>
            <li>
              <a
                href="/api/health"
                className="text-blue-600 hover:text-blue-800 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Health Check Endpoint
              </a>
            </li>
          </ul>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">Getting Started</h2>
          <div className="prose prose-blue max-w-none">
            <h3 className="text-lg font-medium text-blue-900">Authentication</h3>
            <p className="text-blue-800">
              All API endpoints (except health check) require authentication via Supabase session
              cookies. The session cookie (<code>supabase-auth-token</code>) is automatically set
              after successful login.
            </p>

            <h3 className="text-lg font-medium text-blue-900 mt-4">Rate Limiting</h3>
            <p className="text-blue-800">The API implements tiered rate limiting:</p>
            <ul className="list-disc list-inside text-blue-800 space-y-1">
              <li>Tier 1 (Standard): 100 requests/minute for data retrieval</li>
              <li>
                Tier 2 (Resource Creation): 10 requests/minute for AI generation and project
                creation
              </li>
              <li>Tier 3 (Heavy Operations): 5 requests/minute for exports and batch operations</li>
            </ul>

            <h3 className="text-lg font-medium text-blue-900 mt-4">Versioning</h3>
            <p className="text-blue-800">
              The API uses path-based versioning (e.g., <code>/api/v1/projects</code>). Current
              stable version: <strong>v1</strong>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
