/**
 * CSP Nonce Utilities
 *
 * Helper functions to retrieve and use CSP nonces in Next.js
 */

import { headers } from 'next/headers';
import { CSP_NONCE_HEADER } from './csp';

/**
 * Get the CSP nonce from request headers (Server Components)
 *
 * Usage in Server Components:
 * ```tsx
 * import { getNonce } from '@/lib/security/getNonce';
 *
 * export default async function Page() {
 *   const nonce = await getNonce();
 *   return <script nonce={nonce}>...</script>
 * }
 * ```
 *
 * @returns CSP nonce string or undefined
 */
export async function getNonce(): Promise<string | undefined> {
  const headersList = await headers();
  return headersList.get(CSP_NONCE_HEADER) || undefined;
}
