import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation',
  description: 'Learn how to use the Nonlinear Editor with comprehensive guides and tutorials.',
  openGraph: {
    title: 'Documentation | Nonlinear Editor',
    description: 'User guides and tutorials',
  },
  twitter: {
    title: 'Documentation | Nonlinear Editor',
    description: 'User guides and tutorials',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function DocsLayout({ children }: { children: React.ReactNode }): React.ReactNode {
  return children;
}
