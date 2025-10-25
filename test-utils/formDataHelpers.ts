/**
 * FormData Testing Utilities
 *
 * Provides helper functions for testing API routes that accept FormData.
 * These utilities simplify the creation of FormData requests with authentication,
 * making tests more readable and maintainable.
 *
 * Key Features:
 * - Create FormData from plain objects
 * - Create authenticated FormData requests
 * - Create unauthenticated FormData requests
 * - Support for file attachments
 * - Type-safe field definitions
 *
 * Usage:
 * ```typescript
 * import { createAuthFormDataRequest, createTestFormData } from '@/test-utils/formDataHelpers';
 *
 * describe('POST /api/example', () => {
 *   it('should handle FormData', async () => {
 *     const formData = createTestFormData({
 *       message: 'Hello',
 *       model: 'gpt-4',
 *     });
 *
 *     const request = createAuthFormDataRequest(formData);
 *     const response = await POST(request, { params: Promise.resolve({}) });
 *
 *     expect(response.status).toBe(200);
 *   });
 * });
 * ```
 */

import { NextRequest } from 'next/server';
import { createTestUser } from './testWithAuth';
import type { User } from '@supabase/supabase-js';

/**
 * Type-safe FormData field value
 * Can be string, File, or null
 */
export type FormDataValue = string | File | null | undefined;

/**
 * Object representing FormData fields
 */
export interface FormDataFields {
  [key: string]: FormDataValue | FormDataValue[];
}

/**
 * Create FormData from a plain object
 *
 * @param fields - Object with key-value pairs to convert to FormData
 * @returns FormData instance with all fields set
 *
 * @example
 * ```typescript
 * const formData = createTestFormData({
 *   message: 'Hello',
 *   model: 'gpt-4',
 *   projectId: '123',
 * });
 * ```
 */
export function createTestFormData(fields: FormDataFields): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    // Skip undefined or null values
    if (value === undefined || value === null) {
      continue;
    }

    // Handle arrays of values
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null) {
          formData.append(key, item);
        }
      });
    } else {
      formData.append(key, value);
    }
  }

  return formData;
}

/**
 * Create an authenticated FormData request for testing
 *
 * This helper creates a NextRequest with FormData body and injects
 * a test user for authentication.
 *
 * @param formData - FormData to send in request body
 * @param options - Additional options (user, url, headers)
 * @returns Object with request and user
 *
 * @example
 * ```typescript
 * const formData = createTestFormData({ message: 'Hello' });
 * const { request, user } = createAuthFormDataRequest(formData);
 * ```
 */
export function createAuthFormDataRequest(
  formData: FormData,
  options: {
    user?: User;
    url?: string;
    headers?: Record<string, string>;
  } = {}
): { request: NextRequest; user: User } {
  const user = options.user || createTestUser();
  const url = options.url || 'http://localhost/api/test';

  const headers = new Headers(options.headers || {});

  const request = new NextRequest(url, {
    method: 'POST',
    body: formData,
    headers,
  });

  // Attach user to request for test auth to pick up
  (request as any).__testUser = user;  

  return { request, user };
}

/**
 * Create an unauthenticated FormData request for testing
 *
 * This helper creates a NextRequest with FormData body but without
 * authentication. Useful for testing auth failures.
 *
 * @param formData - FormData to send in request body
 * @param options - Additional options (url, headers)
 * @returns NextRequest instance without auth
 *
 * @example
 * ```typescript
 * const formData = createTestFormData({ message: 'Hello' });
 * const request = createUnauthFormDataRequest(formData);
 * ```
 */
export function createUnauthFormDataRequest(
  formData: FormData,
  options: {
    url?: string;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const url = options.url || 'http://localhost/api/test';
  const headers = new Headers(options.headers || {});

  const request = new NextRequest(url, {
    method: 'POST',
    body: formData,
    headers,
  });

  return request;
}

/**
 * Create a test File instance
 *
 * @param content - File content (string or buffer)
 * @param filename - Name of the file
 * @param options - File options (type, lastModified)
 * @returns File instance
 *
 * @example
 * ```typescript
 * const imageFile = createTestFile('image data', 'test.jpg', { type: 'image/jpeg' });
 * const pdfFile = createTestFile('pdf data', 'doc.pdf', { type: 'application/pdf' });
 * ```
 */
export function createTestFile(
  content: string | ArrayBuffer,
  filename: string,
  options: {
    type?: string;
    lastModified?: number;
  } = {}
): File {
  const blob = typeof content === 'string' ? new Blob([content]) : new Blob([content]);
  return new File([blob], filename, {
    type: options.type || 'text/plain',
    lastModified: options.lastModified || Date.now(),
  });
}

/**
 * Create FormData with file attachments
 *
 * @param fields - Base fields for FormData
 * @param files - Array of files to attach
 * @returns FormData with fields and files
 *
 * @example
 * ```typescript
 * const formData = createFormDataWithFiles(
 *   { message: 'Check this image', model: 'gpt-4' },
 *   [
 *     createTestFile('image data', 'test.jpg', { type: 'image/jpeg' }),
 *     createTestFile('pdf data', 'doc.pdf', { type: 'application/pdf' }),
 *   ]
 * );
 * ```
 */
export function createFormDataWithFiles(fields: FormDataFields, files: File[]): FormData {
  const formData = createTestFormData(fields);

  files.forEach((file, index) => {
    formData.append(`file-${index}`, file);
  });

  return formData;
}
