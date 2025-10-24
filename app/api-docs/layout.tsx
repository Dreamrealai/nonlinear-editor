import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Documentation',
  description:
    'Comprehensive API documentation for integrating with the Nonlinear Editor platform.',
  openGraph: {
    title: 'API Documentation | Nonlinear Editor',
    description: 'Developer API documentation',
  },
  twitter: {
    title: 'API Documentation | Nonlinear Editor',
    description: 'Developer API documentation',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ApiDocsLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  return children;
}
