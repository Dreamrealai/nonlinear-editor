/**
 * API Request and Response Type Definitions
 *
 * This file contains TypeScript type definitions for all API endpoints
 * in the non-linear video editor application.
 *
 * @module types/api
 */

// ============================================================================
// PROJECT TYPES
// ============================================================================

export interface CreateProjectRequest {
  title?: string;
}

/**
 * Timeline state stored in project database
 */
export interface ProjectTimelineState {
  projectId: string;
  clips: Array<{
    id: string;
    assetId: string;
    start: number;
    end: number;
    timelinePosition: number;
    trackIndex: number;
    [key: string]: unknown; // Allow additional clip properties
  }>;
  output?: {
    width: number;
    height: number;
    fps: number;
    vBitrateK: number;
    aBitrateK: number;
    format: 'mp4' | 'webm';
  };
  [key: string]: unknown; // Allow additional state properties
}

export interface CreateProjectResponse {
  id: string;
  title: string;
  user_id: string;
  timeline_state_jsonb: ProjectTimelineState;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// ASSET TYPES
// ============================================================================

export type AssetType = 'image' | 'video' | 'audio';
export type AssetSource = 'upload' | 'genai';

export interface UploadAssetRequest {
  file: File;
  projectId: string;
  type: AssetType;
}

export interface UploadAssetResponse {
  assetId: string;
  storageUrl: string;
  publicUrl: string;
  success: boolean;
}

export interface SignedUrlRequest {
  assetId?: string;
  storageUrl?: string;
}

export interface SignedUrlResponse {
  signedUrl: string;
  expiresIn: number;
}

/**
 * Asset metadata structure
 */
export interface AssetMetadataDetails {
  filename?: string;
  mimeType?: string;
  thumbnail?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  originalName?: string;
  fileSize?: number;
  [key: string]: unknown; // Allow additional metadata fields
}

export interface Asset {
  id: string;
  project_id: string;
  user_id: string;
  type: AssetType;
  source: AssetSource;
  storage_url: string;
  mime_type?: string;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  metadata?: AssetMetadataDetails;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// VIDEO GENERATION TYPES
// ============================================================================

export type VideoModel = 'veo-002' | 'veo-003' | 'seedance-1.0-pro' | 'minimax-hailuo-02-pro';
export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
export type VideoResolution = '480p' | '720p' | '1080p';
export type PersonGeneration = 'dont_allow' | 'allow_adult' | 'allow_all';

export interface GenerateVideoRequest {
  prompt: string;
  projectId: string;
  model: VideoModel;
  aspectRatio?: AspectRatio;
  duration?: number;
  resolution?: VideoResolution;
  negativePrompt?: string;
  personGeneration?: PersonGeneration;
  enhancePrompt?: boolean;
  generateAudio?: boolean;
  seed?: number;
  sampleCount?: number;
  compressionQuality?: number;
  imageAssetId?: string;
}

export interface GenerateVideoResponse {
  operationName: string;
  status: 'processing';
  message: string;
}

export interface VideoStatusRequest {
  operationName: string;
  projectId: string;
}

export interface VideoStatusResponse {
  done: boolean;
  progress?: number;
  error?: string;
  asset?: Asset;
  storageUrl?: string;
}

// ============================================================================
// IMAGE GENERATION TYPES
// ============================================================================

export type ImageModel = 'imagen-3.0-generate-001' | 'imagen-3.0-fast';
export type SafetyFilterLevel = 'block_most' | 'block_some' | 'block_few';
export type OutputMimeType = 'image/png' | 'image/jpeg';

export interface GenerateImageRequest {
  prompt: string;
  projectId: string;
  model?: ImageModel;
  aspectRatio?: AspectRatio;
  negativePrompt?: string;
  sampleCount?: number;
  seed?: number;
  safetyFilterLevel?: SafetyFilterLevel;
  personGeneration?: PersonGeneration;
  addWatermark?: boolean;
  language?: string;
  outputMimeType?: OutputMimeType;
}

export interface GenerateImageResponse {
  assets: Asset[];
  message: string;
}

// ============================================================================
// AUDIO GENERATION TYPES
// ============================================================================

export interface GenerateElevenLabsTTSRequest {
  text: string;
  projectId: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarity?: number;
}

export interface GenerateElevenLabsTTSResponse {
  success: boolean;
  asset: Asset;
  message: string;
}

export interface GenerateElevenLabsSFXRequest {
  prompt: string;
  projectId: string;
  duration?: number;
}

export interface GenerateElevenLabsSFXResponse {
  success: boolean;
  asset: Asset;
  message: string;
}

export interface VoiceLabels {
  accent?: string;
  age?: string;
  gender?: string;
  useCase?: string;
  [key: string]: string | undefined;
}

export interface ListVoicesResponse {
  voices: Array<{
    voice_id: string;
    name: string;
    category?: string;
    labels?: VoiceLabels;
  }>;
}

export interface GenerateSunoMusicRequest {
  prompt: string;
  projectId: string;
  make_instrumental?: boolean;
  wait_audio?: boolean;
}

export interface GenerateSunoMusicResponse {
  ids: string[];
  message: string;
}

export interface SunoStatusRequest {
  ids: string[];
}

export interface SunoStatusResponse {
  clips: Array<{
    id: string;
    status: string;
    audio_url?: string;
    title?: string;
    tags?: string;
  }>;
}

// ============================================================================
// VIDEO PROCESSING TYPES
// ============================================================================

export interface SplitScenesRequest {
  assetId: string;
}

export interface SceneTimestamp {
  start: number;
  end: number;
}

export interface SplitScenesResponse {
  scenes: SceneTimestamp[];
}

export interface SplitAudioRequest {
  videoAssetId: string;
  projectId: string;
}

export type SplitAudioResponse = Asset;

export interface UpscaleVideoRequest {
  assetId: string;
  scaleFactor?: 2 | 4;
}

export interface UpscaleVideoResponse {
  jobId: string;
  status: string;
  message: string;
}

export interface UpscaleStatusRequest {
  jobId: string;
}

export interface UpscaleStatusResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  resultUrl?: string;
  error?: string;
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

import { TransitionType } from './timeline';

export type ExportFormat = 'mp4' | 'webm';

export interface TimelineClip {
  id: string;
  assetId: string;
  start: number;
  end: number;
  timelinePosition: number;
  trackIndex: number;
  transitionToNext?: {
    type: TransitionType;
    duration: number;
  };
  volume?: number;
  opacity?: number;
  speed?: number;
}

export interface OutputSpec {
  width: number;
  height: number;
  fps: number;
  vBitrateK: number;
  aBitrateK: number;
  format: ExportFormat;
}

export interface ExportVideoRequest {
  projectId: string;
  timeline: {
    clips: TimelineClip[];
  };
  outputSpec: OutputSpec;
}

export interface ExportVideoResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  message: string;
  estimatedTime?: number;
}

// ============================================================================
// AI CHAT TYPES
// ============================================================================

export interface AIChatRequest {
  message: string;
  projectId?: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface AIChatResponse {
  response: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================================================
// FRAME EDITING TYPES
// ============================================================================

export interface FrameTransformations {
  scale?: number;
  rotation?: number;
  opacity?: number;
  x?: number;
  y?: number;
}

export interface EditFrameRequest {
  transformations: FrameTransformations;
}

export interface EditFrameResponse {
  success: boolean;
  frameId: string;
  transformations: FrameTransformations;
}

// ============================================================================
// LOGGING TYPES
// ============================================================================

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * Log metadata structure
 */
export interface LogMetadata {
  userId?: string;
  projectId?: string;
  assetId?: string;
  operationName?: string;
  duration?: number;
  statusCode?: number;
  errorCode?: string;
  [key: string]: unknown; // Allow additional metadata fields
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  metadata?: LogMetadata;
}

export interface SubmitLogsRequest {
  logs: LogEntry[];
}

export interface SubmitLogsResponse {
  success: boolean;
  received: number;
}

// ============================================================================
// ADMIN TYPES
// ============================================================================

export type UserTier = 'free' | 'pro' | 'enterprise';

export interface ChangeTierRequest {
  userId: string;
  newTier: UserTier;
}

export interface ChangeTierResponse {
  success: boolean;
  userId: string;
  newTier: UserTier;
}

export interface DeleteUserRequest {
  userId: string;
}

export interface DeleteUserResponse {
  success: boolean;
  userId: string;
}

// ============================================================================
// HISTORY TYPES
// ============================================================================

/**
 * Activity metadata structure
 */
export interface ActivityMetadata {
  prompt?: string;
  duration?: number;
  resolution?: string;
  aspectRatio?: string;
  parameters?: {
    model?: string;
    seed?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown; // Allow additional metadata fields
}

export interface ActivityHistoryItem {
  id: string;
  user_id: string;
  project_id: string;
  activity_type: string;
  title: string;
  description?: string;
  model?: string;
  asset_id?: string;
  metadata?: ActivityMetadata;
  created_at: string;
}

export interface GetHistoryRequest {
  projectId?: string;
  limit?: number;
  offset?: number;
}

export interface GetHistoryResponse {
  activities: ActivityHistoryItem[];
  total: number;
  hasMore: boolean;
}

// ============================================================================
// STRIPE PAYMENT TYPES
// ============================================================================

export interface CreateCheckoutRequest {
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CreateCheckoutResponse {
  url: string;
  sessionId: string;
}

export interface CreatePortalResponse {
  url: string;
}

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

export interface SignOutResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// ERROR TYPES - Using Discriminated Unions
// ============================================================================

/**
 * Base error structure
 */
interface BaseAPIError {
  error: string;
  message?: string;
  status?: number;
}

/**
 * Validation error with field information
 */
export interface ValidationError extends BaseAPIError {
  type: 'validation';
  field: string;
  code?: string;
}

/**
 * Rate limit error with limit information
 */
export interface RateLimitError extends BaseAPIError {
  type: 'rate_limit';
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Authentication error
 */
export interface AuthenticationError extends BaseAPIError {
  type: 'authentication';
  code?: 'invalid_token' | 'expired_token' | 'missing_token';
}

/**
 * Authorization error (insufficient permissions)
 */
export interface AuthorizationError extends BaseAPIError {
  type: 'authorization';
  requiredPermission?: string;
}

/**
 * Not found error
 */
export interface NotFoundError extends BaseAPIError {
  type: 'not_found';
  resource?: string;
  resourceId?: string;
}

/**
 * Server error
 */
export interface ServerError extends BaseAPIError {
  type: 'server';
  code?: string;
}

/**
 * Generic API error (backward compatibility)
 */
export interface GenericAPIError extends BaseAPIError {
  type: 'generic';
  field?: string;
  code?: string;
}

/**
 * Discriminated union of all error types
 * Allows type-safe error handling with exhaustiveness checking
 */
export type APIError =
  | ValidationError
  | RateLimitError
  | AuthenticationError
  | AuthorizationError
  | NotFoundError
  | ServerError
  | GenericAPIError;

// ============================================================================
// ============================================================================
// CHAT TYPES
// ============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  model?: string;
  attachments?: Array<{
    name: string;
    type: string;
    url: string;
  }>;
}

// ============================================================================
// COMMON RESPONSE WRAPPER - Using Discriminated Unions
// ============================================================================

/**
 * Success response wrapper
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Error response wrapper
 */
export interface ErrorResponse {
  success: false;
  error: APIError;
}

/**
 * Discriminated union for API responses
 * Allows type narrowing based on success field
 *
 * @example
 * ```ts
 * const response: APIResponse<User> = await fetchUser();
 * if (response.success) {
 *   console.log(response.data.name); // Type-safe access to data
 * } else {
 *   console.error(response.error.error); // Type-safe access to error
 * }
 * ```
 */
export type APIResponse<T> = SuccessResponse<T> | ErrorResponse;

/**
 * Legacy type for backward compatibility
 * @deprecated Use APIResponse<T> instead
 */
export type LegacyAPIResponse<T> = T | APIError;

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}
