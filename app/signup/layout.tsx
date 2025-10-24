import type { Metadata } from 'next';

// Force dynamic rendering for signup page to avoid build-time Supabase dependency
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign Up',
  description:
    'Create a free account to start editing videos in your browser. No credit card required.',
  openGraph: {
    title: 'Sign Up | Nonlinear Editor',
    description: 'Start editing videos for free',
  },
  twitter: {
    title: 'Sign Up | Nonlinear Editor',
    description: 'Start editing videos for free',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function SignUpLayout({ children }: { children: React.ReactNode }): React.ReactNode {
  return children;
}
