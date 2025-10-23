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

export interface CreateProjectResponse {
  id: string;
  title: string;
  user_id: string;
  timeline_state_jsonb: Record<string, unknown>;
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
  metadata?: Record<string, unknown>;
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

export interface ListVoicesResponse {
  voices: Array<{
    voice_id: string;
    name: string;
    category?: string;
    labels?: Record<string, string>;
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

export interface SplitAudioResponse extends Asset {}

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

export type ExportFormat = 'mp4' | 'webm';
export type TransitionType = 'crossfade' | 'fade-in' | 'fade-out';

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

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
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

export interface ActivityHistoryItem {
  id: string;
  user_id: string;
  project_id: string;
  activity_type: string;
  title: string;
  description?: string;
  model?: string;
  asset_id?: string;
  metadata?: Record<string, unknown>;
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
// ERROR TYPES
// ============================================================================

export interface APIError {
  error: string;
  message?: string;
  field?: string;
  code?: string;
  status?: number;
}

export interface ValidationError extends APIError {
  field: string;
}

export interface RateLimitError extends APIError {
  limit: number;
  remaining: number;
  resetAt: number;
}

// ============================================================================
// COMMON RESPONSE WRAPPER
// ============================================================================

export type APIResponse<T> = T | APIError;

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}
