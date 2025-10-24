import type { Metadata } from 'next';

// Force dynamic rendering for signin page to avoid build-time Supabase dependency
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign In',
  description:
    'Sign in to your account to access powerful video editing tools and manage your projects.',
  openGraph: {
    title: 'Sign In | Nonlinear Editor',
    description: 'Access your video editing workspace',
  },
  twitter: {
    title: 'Sign In | Nonlinear Editor',
    description: 'Access your video editing workspace',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function SignInLayout({ children }: { children: React.ReactNode }): React.ReactNode {
  return children;
}
