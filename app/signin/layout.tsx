// Force dynamic rendering for signin page to avoid build-time Supabase dependency
export const dynamic = 'force-dynamic';

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
