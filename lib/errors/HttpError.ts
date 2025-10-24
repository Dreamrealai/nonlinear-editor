/**
 * HTTP Error class that carries a status code
 *
 * Use this to throw errors that should result in specific HTTP status codes
 * instead of generic 500 errors.
 *
 * @example
 * ```typescript
 * throw new HttpError('Rate limit exceeded', 429);
 * throw new HttpError('Service unavailable', 503);
 * ```
 */
export class HttpError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'HttpError';
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpError);
    }
  }
}

/**
 * Type guard to check if an error is an HttpError
 */
export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}
