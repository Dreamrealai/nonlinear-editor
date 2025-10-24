/**
 * Service Layer Exports
 *
 * Centralized exports for all service layer modules.
 * Import services from here for cleaner code and easier refactoring.
 *
 * Usage:
 * ```typescript
 * import {
 *   AuthService,
 *   ProjectService,
 *   AssetService,
 *   VideoService,
 *   AudioService
 * } from '@/lib/services';
 * ```
 */

// Authentication Service
export { AuthService } from './authService';
export type { User, UserProfile } from './authService';

// Project Service
export { ProjectService } from './projectService';
export type { Project, CreateProjectOptions } from './projectService';

// Asset Service
export { AssetService } from './assetService';
export type { Asset, ImageAssetMetadata, CreateImageAssetOptions } from './assetService';

// Video Service
export { VideoService } from './videoService';
export type {
  VideoGenerationOptions,
  VideoGenerationResult,
  VideoStatusResult,
} from './videoService';

// Audio Service
export { AudioService } from './audioService';
export type {
  TTSGenerationOptions,
  TTSGenerationResult,
  MusicGenerationOptions,
  MusicGenerationResult,
  SFXGenerationOptions,
} from './audioService';

// Sentry Error Tracking Service
export { sentryService, isSentryConfigured } from './sentryService';
export type { ErrorContext, BreadcrumbData, UserContext } from './sentryService';

// Analytics Service (PostHog)
export { analyticsService, isPostHogConfigured, AnalyticsEvents } from './analyticsService';
export type { EventProperties, UserProperties } from './analyticsService';
