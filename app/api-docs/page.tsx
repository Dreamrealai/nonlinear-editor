'use client';

import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';

export default function APIDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      <ApiReferenceReact
        configuration={{
          url: '/openapi.json',
        }}
      />
    </div>
  );
}
