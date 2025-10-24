/**
 * API Documentation Page
 *
 * Interactive API documentation using Scalar API Reference.
 * Displays the OpenAPI specification with a user-friendly interface.
 */

'use client';

import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';

export default function APIDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      <ApiReferenceReact
        configuration={{
          url: '/api/docs',
        }}
      />
    </div>
  );
}
