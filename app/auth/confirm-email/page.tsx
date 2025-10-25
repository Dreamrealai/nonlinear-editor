'use client';

import Link from 'next/link';

export default function ConfirmEmailPage(): React.JSX.Element {
  return (
    <div className="space-y-6 text-center">
      <div>
        <h3 className="text-xl font-medium">Confirm your email</h3>
        <p className="text-sm text-gray-500">
          We sent an email to your address. Please click the link in the email to confirm your
          account.
        </p>
      </div>

      <div className="text-sm">
        <p className="text-gray-500">
          Didn&apos;t receive an email?{' '}
          <Link
            href="/auth/resend-email"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Resend email
          </Link>
        </p>
      </div>
    </div>
  );
}
