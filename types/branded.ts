/**
 * Branded Types for Type Safety
 *
 * This file contains branded types that provide compile-time safety
 * for values that should not be mixed up (e.g., different ID types).
 *
 * Branded types prevent accidental misuse of similar primitive types
 * by adding a phantom type brand.
 *
 * @module types/branded
 */

/**
 * Phantom brand type
 * This creates a unique type brand that only exists at compile time
 */
declare const brand: unique symbol;

/**
 * Generic branded type
 * Adds a compile-time brand to a base type
 */
export type Brand<T, TBrand extends string> = T & {
  readonly [brand]: TBrand;
};

/**
 * Branded string types for IDs
 * Prevents mixing up different types of IDs
 */
export type UserId = Brand<string, 'UserId'>;
export type ProjectId = Brand<string, 'ProjectId'>;
export type AssetId = Brand<string, 'AssetId'>;
export type ClipId = Brand<string, 'ClipId'>;
export type TrackId = Brand<string, 'TrackId'>;
export type MarkerId = Brand<string, 'MarkerId'>;
export type TextOverlayId = Brand<string, 'TextOverlayId'>;
export type OperationName = Brand<string, 'OperationName'>;
export type JobId = Brand<string, 'JobId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type VoiceId = Brand<string, 'VoiceId'>;

/**
 * Branded types for sensitive data
 * Helps prevent logging or exposing sensitive information
 */
export type ApiKey = Brand<string, 'ApiKey'>;
export type AccessToken = Brand<string, 'AccessToken'>;
export type RefreshToken = Brand<string, 'RefreshToken'>;
export type Password = Brand<string, 'Password'>;

/**
 * Branded number types
 * Prevents mixing up different types of numeric values
 */
export type Timestamp = Brand<number, 'Timestamp'>;
export type Duration = Brand<number, 'Duration'>;
export type FileSize = Brand<number, 'FileSize'>;
export type Percentage = Brand<number, 'Percentage'>;

/**
 * Type guard to check if a value is branded
 * Note: This is only for documentation; brands don't exist at runtime
 */
export function isBranded<T extends string>(
  value: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _brand: T
): value is Brand<string, T> {
  return typeof value === 'string';
}

/**
 * Brand a value with a specific brand type
 * Use this to convert a regular value to a branded type
 *
 * @example
 * ```ts
 * const userId = brand<UserId>('user-123');
 * const projectId = brand<ProjectId>('project-456');
 * // These types are now incompatible at compile time
 * ```
 */
export function brandValue<T extends Brand<unknown, string>>(value: unknown): T {
  return value as T;
}

/**
 * Unbrand a value to get the underlying primitive
 * Use when you need to pass a branded value to an API that expects a primitive
 *
 * @example
 * ```ts
 * const userId: UserId = brand<UserId>('user-123');
 * const plainId: string = unbrand(userId);
 * ```
 */
export function unbrand<T>(value: Brand<T, string>): T {
  return value as T;
}

/**
 * Helper to create branded IDs from strings
 */
export const BrandedId = {
  user: (id: string): UserId => brandValue<UserId>(id),
  project: (id: string): ProjectId => brandValue<ProjectId>(id),
  asset: (id: string): AssetId => brandValue<AssetId>(id),
  clip: (id: string): ClipId => brandValue<ClipId>(id),
  track: (id: string): TrackId => brandValue<TrackId>(id),
  marker: (id: string): MarkerId => brandValue<MarkerId>(id),
  textOverlay: (id: string): TextOverlayId => brandValue<TextOverlayId>(id),
  operation: (name: string): OperationName => brandValue<OperationName>(name),
  job: (id: string): JobId => brandValue<JobId>(id),
  session: (id: string): SessionId => brandValue<SessionId>(id),
  voice: (id: string): VoiceId => brandValue<VoiceId>(id),
} as const;

/**
 * Type-safe branded percentage (0-100)
 * Ensures values are within valid range
 */
export function createPercentage(value: number): Percentage | null {
  if (value < 0 || value > 100) {
    return null;
  }
  return brandValue<Percentage>(value);
}

/**
 * Type-safe branded duration (in milliseconds)
 */
export function createDuration(ms: number): Duration | null {
  if (ms < 0) {
    return null;
  }
  return brandValue<Duration>(ms);
}

/**
 * Type-safe branded timestamp (Unix timestamp in milliseconds)
 */
export function createTimestamp(ms: number): Timestamp {
  return brandValue<Timestamp>(ms);
}

/**
 * Type-safe branded file size (in bytes)
 */
export function createFileSize(bytes: number): FileSize | null {
  if (bytes < 0) {
    return null;
  }
  return brandValue<FileSize>(bytes);
}
