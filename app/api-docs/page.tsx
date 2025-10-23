'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';
import type SwaggerUIType from 'swagger-ui-react';
import type { ComponentType } from 'react';

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false }) as ComponentType<React.ComponentProps<typeof SwaggerUIType>>;

export default function APIDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Non-Linear Video Editor API Documentation
          </h1>
          <p className="text-gray-600">
            Complete API reference for video editing, AI generation, and asset management.
          </p>
        </div>

        <SwaggerUI url="/openapi.json" />
      </div>
    </div>
  );
}
