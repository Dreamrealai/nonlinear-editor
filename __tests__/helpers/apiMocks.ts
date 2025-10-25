/**
 * API Mock Helpers
 *
 * @deprecated This file is DEPRECATED and should not be used.
 * All helpers have been moved to /test-utils/ for better organization.
 *
 * MIGRATION GUIDE:
 * ================
 *
 * Old import:
 * import { createMockSupabaseClient } from '@/__tests__/helpers/apiMocks';
 *
 * New import:
 * import { createMockSupabaseClient } from '@/test-utils';
 *
 * All functions from this file are available in @/test-utils with improved
 * documentation, better TypeScript support, and additional features.
 *
 * See: /test-utils/index.ts for full API
 * See: /docs/TEST_ARCHITECTURE.md for usage patterns
 *
 * THIS FILE WILL BE REMOVED IN THE NEXT RELEASE.
 */

// Re-export from consolidated test-utils to prevent breaking changes
export {
  createMockSupabaseClient,
  createMockUser,
  createMockProject,
  createMockAsset,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockQuerySuccess,
  mockQueryError,
  mockStorageUploadSuccess,
  mockStorageUploadError,
  resetAllMocks,
} from '@/test-utils';
