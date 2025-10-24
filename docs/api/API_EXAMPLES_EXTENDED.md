# API Examples - Extended Coverage

> **Additional practical examples for API endpoints**
>
> Version: 1.0.0
> Last Updated: 2025-10-24

This document extends [API_EXAMPLES.md](./API_EXAMPLES.md) with examples for additional endpoints.

## Table of Contents

- [Frame Editing](#frame-editing)
- [Video Processing](#video-processing)
  - [Video Upscaling](#video-upscaling)
  - [Scene Detection](#scene-detection)
  - [Audio Extraction](#audio-extraction)
  - [Audio Generation for Video](#audio-generation-for-video)
- [Export Operations](#export-operations)
- [Subscription Management](#subscription-management)
- [Project Management](#project-management)
- [Activity History](#activity-history)
- [Account Management](#account-management)

---

## Frame Editing

### POST /api/frames/[frameId]/edit

Edit a frame from a video using AI-powered image editing.

**Authentication**: Required (Bearer token)

**Rate Limit**: Tier 2 (10/min)

**Request:**

```json
{
  "prompt": "Make the sky more dramatic with storm clouds",
  "mode": "global",
  "numVariations": 2,
  "referenceImages": []
}
```

**Parameters:**

| Parameter       | Type     | Required | Description                                        |
| --------------- | -------- | -------- | -------------------------------------------------- |
| prompt          | string   | Yes      | Editing instructions (max 1000 chars)              |
| mode            | string   | No       | 'global' or 'crop' (default: 'global')             |
| cropX           | number   | No       | X coordinate for crop mode                         |
| cropY           | number   | No       | Y coordinate for crop mode                         |
| cropSize        | number   | No       | Size of crop region in pixels                      |
| feather         | number   | No       | Feather amount for blending (default: 0)           |
| referenceImages | string[] | No       | Array of reference image URLs for style            |
| numVariations   | number   | No       | Number of variations to generate (1-8, default: 4) |

**Success Response (200):**

```json
{
  "success": true,
  "edits": [
    {
      "id": "edit-uuid-1",
      "frame_id": "frame-uuid",
      "project_id": "project-uuid",
      "asset_id": "asset-uuid",
      "version": 1,
      "mode": "global",
      "prompt": "Make the sky more dramatic with storm clouds",
      "model": "gemini-2.5-flash",
      "output_storage_path": "supabase://frames/user-id/project-id/edit-uuid-1.jpg",
      "metadata": {
        "description": "AI-generated editing instructions...",
        "variation": 1
      },
      "description": "To make the sky more dramatic with storm clouds..."
    },
    {
      "id": "edit-uuid-2",
      "version": 2,
      "description": "Alternative interpretation: Add towering cumulonimbus clouds...",
      "variation": 2
    }
  ],
  "count": 2,
  "note": "This is using Gemini 2.5 Flash for image analysis. For actual image generation, Imagen 3 would be used."
}
```

**Error Responses:**

**400 Bad Request** - Invalid prompt or parameters:

```json
{
  "error": "Prompt is required"
}
```

**403 Forbidden** - User doesn't own the frame:

```json
{
  "error": "Unauthorized - you do not own this project"
}
```

**404 Not Found** - Frame doesn't exist:

```json
{
  "error": "Frame not found"
}
```

**503 Service Unavailable** - API not configured:

```json
{
  "error": "Gemini API key not configured. Please set AISTUDIO_API_KEY or GEMINI_API_KEY environment variable."
}
```

**TypeScript Example:**

```typescript
const editFrame = async (frameId: string, prompt: string, numVariations: number = 2) => {
  const response = await fetch(`/api/frames/${frameId}/edit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      mode: 'global',
      numVariations,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Frame edit failed');
  }

  const result = await response.json();
  return result.edits;
};

// Usage
try {
  const edits = await editFrame('frame-123', 'Make the sky more dramatic with storm clouds', 3);

  console.log(`Generated ${edits.length} variations`);
  edits.forEach((edit, i) => {
    console.log(`Variation ${i + 1}: ${edit.description}`);
  });
} catch (error) {
  console.error('Frame editing failed:', error.message);
}
```

**Example with Crop Mode:**

```typescript
const editFrameRegion = async (frameId: string) => {
  const response = await fetch(`/api/frames/${frameId}/edit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: 'Enhance the details in this region',
      mode: 'crop',
      cropX: 100,
      cropY: 100,
      cropSize: 200,
      feather: 10,
      numVariations: 1,
    }),
  });

  const result = await response.json();
  return result.edits[0];
};
```

**Example with Reference Images:**

```typescript
const editWithStyleReference = async (frameId: string, styleImageUrl: string) => {
  const response = await fetch(`/api/frames/${frameId}/edit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: 'Apply the color grading style from the reference image',
      mode: 'global',
      referenceImages: [styleImageUrl],
      numVariations: 2,
    }),
  });

  const result = await response.json();
  return result.edits;
};
```

---

## Video Processing

### Video Upscaling

#### POST /api/video/upscale

Upscale a video using fal.ai Topaz Video Upscale.

**Authentication**: Required

**Rate Limit**: Tier 2 (10/min)

**Request:**

```json
{
  "assetId": "asset-uuid",
  "projectId": "project-uuid",
  "upscaleFactor": 2,
  "targetFps": 60,
  "h264Output": false
}
```

**Parameters:**

| Parameter     | Type    | Required | Description                                     |
| ------------- | ------- | -------- | ----------------------------------------------- |
| assetId       | UUID    | Yes      | ID of video asset to upscale                    |
| projectId     | UUID    | Yes      | Project ID                                      |
| upscaleFactor | number  | No       | Upscale factor (1-4, default: 2)                |
| targetFps     | number  | No       | Target FPS for frame interpolation (optional)   |
| h264Output    | boolean | No       | Use H264 codec instead of H265 (default: false) |

**Success Response (200):**

```json
{
  "requestId": "fal-request-id-12345",
  "message": "Video upscale request submitted successfully"
}
```

**Error Responses:**

**400 Bad Request** - Invalid asset or project ID:

```json
{
  "error": "Invalid assetId",
  "field": "assetId"
}
```

**403 Forbidden** - User doesn't own asset:

```json
{
  "error": "Access denied"
}
```

**429 Too Many Requests**:

```json
{
  "error": "Rate limit exceeded",
  "limit": 10,
  "remaining": 0,
  "resetAt": 1698123456789
}
```

**503 Service Unavailable** - FAL_API_KEY not configured:

```json
{
  "error": "FAL_API_KEY not configured on server"
}
```

**504 Gateway Timeout** - Submission timeout:

```json
{
  "error": "Upscale submission timeout after 60s"
}
```

#### GET /api/video/upscale-status

Check the status of a video upscale operation.

**Query Parameters:**

| Parameter | Type   | Required | Description                        |
| --------- | ------ | -------- | ---------------------------------- |
| requestId | string | Yes      | Request ID from upscale submission |
| projectId | UUID   | Yes      | Project ID                         |

**Request:**

```http
GET /api/video/upscale-status?requestId=fal-request-id-12345&projectId=project-uuid
```

**Success Response (200) - Processing:**

```json
{
  "done": false,
  "status": "processing",
  "progress": 65
}
```

**Success Response (200) - Complete:**

```json
{
  "done": true,
  "asset": {
    "id": "new-asset-uuid",
    "type": "video",
    "storage_url": "supabase://assets/user-id/project-id/video/upscaled-uuid.mp4",
    "metadata": {
      "filename": "upscaled-video.mp4",
      "mimeType": "video/mp4",
      "sourceUrl": "https://storage.example.com/...",
      "upscaleFactor": 2,
      "originalAssetId": "asset-uuid"
    }
  },
  "message": "Video upscaled successfully"
}
```

**Error Response (200) - Failed:**

```json
{
  "done": true,
  "error": "Upscale processing failed: Invalid video format"
}
```

**TypeScript Example:**

```typescript
const upscaleVideo = async (assetId: string, projectId: string) => {
  // Step 1: Submit upscale request
  const response = await fetch('/api/video/upscale', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      assetId,
      projectId,
      upscaleFactor: 2,
      targetFps: 60,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upscale submission failed');
  }

  const { requestId } = await response.json();

  // Step 2: Poll for completion
  const pollUpscaleStatus = async () => {
    const statusResponse = await fetch(
      `/api/video/upscale-status?requestId=${requestId}&projectId=${projectId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return await statusResponse.json();
  };

  // Wait for completion with exponential backoff
  let delay = 5000;
  const maxDelay = 30000;

  while (true) {
    const status = await pollUpscaleStatus();

    if (status.done) {
      if (status.error) {
        throw new Error(status.error);
      }
      return status.asset;
    }

    console.log(`Upscaling progress: ${status.progress}%`);

    await new Promise((resolve) => setTimeout(resolve, delay));
    delay = Math.min(delay * 1.2, maxDelay);
  }
};

// Usage
try {
  const upscaledAsset = await upscaleVideo('asset-123', 'project-456');
  console.log('Video upscaled successfully!', upscaledAsset);
} catch (error) {
  console.error('Upscale failed:', error.message);
}
```

---

### Scene Detection

#### POST /api/video/split-scenes

Detect scene changes in a video using Google Cloud Video Intelligence.

**Authentication**: Required

**Rate Limit**: Tier 2 (10/min)

**Max Duration**: 60 seconds (serverless function limit)

**Request:**

```json
{
  "assetId": "asset-uuid",
  "projectId": "project-uuid"
}
```

**Parameters:**

| Parameter | Type | Required | Description                  |
| --------- | ---- | -------- | ---------------------------- |
| assetId   | UUID | Yes      | ID of video asset to analyze |
| projectId | UUID | Yes      | Project ID                   |

**Success Response (200) - Scenes Detected:**

```json
{
  "message": "Successfully detected 8 scenes",
  "scenes": [
    {
      "id": "scene-uuid-1",
      "project_id": "project-uuid",
      "asset_id": "asset-uuid",
      "start_ms": 0,
      "end_ms": 3450,
      "created_at": "2025-10-24T12:00:00.000Z"
    },
    {
      "id": "scene-uuid-2",
      "start_ms": 3450,
      "end_ms": 7200,
      "created_at": "2025-10-24T12:00:00.000Z"
    }
  ],
  "count": 8,
  "note": "Scene frames can be extracted in the Keyframe Editor"
}
```

**Success Response (200) - Already Detected:**

```json
{
  "message": "Scenes already detected",
  "scenes": [...],
  "count": 8
}
```

**Success Response (200) - No Scenes:**

```json
{
  "message": "No scenes detected in video",
  "count": 0
}
```

**Error Responses:**

**400 Bad Request** - Invalid input:

```json
{
  "error": "Asset ID is required"
}
```

**400 Bad Request** - Wrong asset type:

```json
{
  "error": "Asset must be a video"
}
```

**403 Forbidden** - Access denied:

```json
{
  "error": "Asset not found or access denied"
}
```

**503 Service Unavailable** - Google Cloud not configured:

```json
{
  "error": "Scene detection unavailable",
  "message": "Google Cloud Video Intelligence is not configured on this deployment. Please configure the GOOGLE_SERVICE_ACCOUNT environment variable.",
  "details": "Contact your administrator to enable scene detection features."
}
```

**503 Service Unavailable** - GCS bucket not configured:

```json
{
  "error": "GCS bucket not configured",
  "message": "GCS_BUCKET_NAME environment variable is not set. Configure infrastructure with Terraform.",
  "details": "See /docs/INFRASTRUCTURE.md for setup instructions."
}
```

**502 Bad Gateway** - Video analysis failed:

```json
{
  "error": "Video analysis failed",
  "message": "Google Cloud Video Intelligence API error",
  "details": "The video format may not be supported or the API credentials may be invalid"
}
```

**TypeScript Example:**

```typescript
const detectScenes = async (assetId: string, projectId: string) => {
  const response = await fetch('/api/video/split-scenes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      assetId,
      projectId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();

    // Handle specific error cases
    if (response.status === 503) {
      throw new Error(`Service not available: ${error.message}`);
    }

    throw new Error(error.error || 'Scene detection failed');
  }

  const result = await response.json();
  return result.scenes;
};

// Usage with error handling
try {
  const scenes = await detectScenes('asset-123', 'project-456');

  console.log(`Detected ${scenes.length} scenes:`);
  scenes.forEach((scene, i) => {
    const durationSec = (scene.end_ms - scene.start_ms) / 1000;
    console.log(
      `Scene ${i + 1}: ${scene.start_ms}ms - ${scene.end_ms}ms (${durationSec.toFixed(2)}s)`
    );
  });

  // Use scenes to create clips
  const clips = scenes.map((scene, i) => ({
    id: `clip-${i}`,
    assetId: scene.asset_id,
    start: scene.start_ms,
    end: scene.end_ms,
    timelinePosition: i === 0 ? 0 : scenes[i - 1].end_ms,
    trackIndex: 0,
  }));
} catch (error) {
  if (error.message.includes('not configured')) {
    console.error('Scene detection is not available on this deployment');
    // Show user message about contacting admin
  } else {
    console.error('Scene detection failed:', error.message);
  }
}
```

---

### Audio Extraction

#### POST /api/video/split-audio

Extract audio track from a video file.

**Authentication**: Required

**Rate Limit**: Tier 2 (10/min)

**Request:**

```json
{
  "assetId": "video-asset-uuid",
  "projectId": "project-uuid"
}
```

**Parameters:**

| Parameter | Type | Required | Description       |
| --------- | ---- | -------- | ----------------- |
| assetId   | UUID | Yes      | ID of video asset |
| projectId | UUID | Yes      | Project ID        |

**Success Response (200):**

```json
{
  "success": true,
  "audioAsset": {
    "id": "audio-asset-uuid",
    "project_id": "project-uuid",
    "user_id": "user-uuid",
    "type": "audio",
    "source": "extracted",
    "storage_url": "supabase://assets/user-id/project-id/audio/extracted-uuid.mp3",
    "metadata": {
      "filename": "extracted-audio.mp3",
      "mimeType": "audio/mpeg",
      "sourceVideoAssetId": "video-asset-uuid",
      "extractedAt": "2025-10-24T12:00:00.000Z"
    }
  },
  "message": "Audio extracted successfully"
}
```

**Error Responses:**

**400 Bad Request** - Invalid video:

```json
{
  "error": "Asset must be a video with audio track"
}
```

**TypeScript Example:**

```typescript
const extractAudio = async (videoAssetId: string, projectId: string) => {
  const response = await fetch('/api/video/split-audio', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      assetId: videoAssetId,
      projectId,
    }),
  });

  if (!response.ok) {
    throw new Error('Audio extraction failed');
  }

  const result = await response.json();
  return result.audioAsset;
};

// Usage
const audioAsset = await extractAudio('video-123', 'project-456');
console.log('Audio extracted:', audioAsset.storage_url);
```

---

### Audio Generation for Video

#### POST /api/video/generate-audio

Generate audio for a video using Google Veo.

**Authentication**: Required

**Rate Limit**: Tier 2 (10/min)

**Request:**

```json
{
  "videoAssetId": "video-asset-uuid",
  "projectId": "project-uuid",
  "audioPrompt": "Ambient nature sounds with bird chirping"
}
```

**Parameters:**

| Parameter    | Type   | Required | Description                      |
| ------------ | ------ | -------- | -------------------------------- |
| videoAssetId | UUID   | Yes      | ID of video asset                |
| projectId    | UUID   | Yes      | Project ID                       |
| audioPrompt  | string | No       | Description of audio to generate |

**Success Response (200):**

```json
{
  "operationName": "projects/123/locations/us-central1/operations/789",
  "status": "processing",
  "message": "Audio generation started"
}
```

#### GET /api/video/generate-audio-status

Check status of audio generation.

**Query Parameters:**

| Parameter     | Type   | Required | Description                  |
| ------------- | ------ | -------- | ---------------------------- |
| operationName | string | Yes      | Operation ID from generation |
| projectId     | UUID   | Yes      | Project ID                   |

**Success Response (200) - Complete:**

```json
{
  "done": true,
  "audioAsset": {
    "id": "audio-asset-uuid",
    "type": "audio",
    "storage_url": "supabase://assets/.../generated-audio.mp3",
    "metadata": {
      "filename": "generated-audio.mp3",
      "provider": "veo",
      "audioPrompt": "Ambient nature sounds with bird chirping"
    }
  }
}
```

**TypeScript Example:**

```typescript
const generateVideoAudio = async (videoAssetId: string, projectId: string, audioPrompt: string) => {
  // Start generation
  const response = await fetch('/api/video/generate-audio', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      videoAssetId,
      projectId,
      audioPrompt,
    }),
  });

  const { operationName } = await response.json();

  // Poll for completion
  let delay = 5000;
  while (true) {
    const statusResponse = await fetch(
      `/api/video/generate-audio-status?operationName=${encodeURIComponent(operationName)}&projectId=${projectId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const status = await statusResponse.json();

    if (status.done) {
      if (status.error) throw new Error(status.error);
      return status.audioAsset;
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
    delay = Math.min(delay * 1.2, 30000);
  }
};
```

---

## Export Operations

### POST /api/export

Export a video timeline to a rendered file.

**Authentication**: Required

**Rate Limit**: Tier 2 (10/min)

**Note**: Requires `VIDEO_EXPORT_ENABLED=true` in environment.

**Request:**

```json
{
  "projectId": "project-uuid",
  "timeline": {
    "clips": [
      {
        "id": "clip-uuid-1",
        "assetId": "asset-uuid-1",
        "start": 0,
        "end": 5000,
        "timelinePosition": 0,
        "trackIndex": 0,
        "volume": 1.0,
        "opacity": 1.0,
        "speed": 1.0,
        "transitionToNext": {
          "type": "crossfade",
          "duration": 500
        }
      },
      {
        "id": "clip-uuid-2",
        "assetId": "asset-uuid-2",
        "start": 1000,
        "end": 8000,
        "timelinePosition": 4500,
        "trackIndex": 0,
        "volume": 0.8,
        "opacity": 1.0,
        "speed": 1.0
      }
    ]
  },
  "outputSpec": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "vBitrateK": 5000,
    "aBitrateK": 192,
    "format": "mp4"
  }
}
```

**Timeline Clip Properties:**

| Property         | Type    | Required | Description                         |
| ---------------- | ------- | -------- | ----------------------------------- |
| id               | UUID    | Yes      | Clip ID                             |
| assetId          | UUID    | Yes      | Asset ID                            |
| start            | integer | Yes      | Start time in milliseconds          |
| end              | integer | Yes      | End time in ms (must be > start)    |
| timelinePosition | integer | Yes      | Position on timeline in ms          |
| trackIndex       | integer | Yes      | Track index (0+)                    |
| volume           | number  | No       | Volume level (0-2, default: 1.0)    |
| opacity          | number  | No       | Opacity (0-1, default: 1.0)         |
| speed            | number  | No       | Playback speed (1-10, default: 1.0) |
| transitionToNext | object  | No       | Transition to next clip             |

**Transition Properties:**

| Property | Type   | Values                             |
| -------- | ------ | ---------------------------------- |
| type     | string | 'crossfade', 'fade-in', 'fade-out' |
| duration | number | Duration in milliseconds           |

**Output Spec Properties:**

| Property  | Type    | Required | Range        | Description            |
| --------- | ------- | -------- | ------------ | ---------------------- |
| width     | integer | Yes      | 1-7680       | Video width in pixels  |
| height    | integer | Yes      | 1-4320       | Video height in pixels |
| fps       | integer | Yes      | 1-120        | Frame rate             |
| vBitrateK | integer | Yes      | 100-50000    | Video bitrate in Kbps  |
| aBitrateK | integer | Yes      | 32-320       | Audio bitrate in Kbps  |
| format    | string  | Yes      | 'mp4','webm' | Output format          |

**Success Response (202 Accepted):**

```json
{
  "jobId": "job-uuid",
  "status": "queued",
  "message": "Export job created and queued for processing.",
  "estimatedTime": 15
}
```

**Error Responses:**

**400 Bad Request** - Invalid timeline:

```json
{
  "error": "Invalid end time at index 0. Must be greater than start time",
  "field": "clip[0].end"
}
```

**400 Bad Request** - Missing required fields:

```json
{
  "error": "Missing required fields: projectId, timeline, outputSpec"
}
```

**403 Forbidden** - Project access denied:

```json
{
  "error": "Access denied"
}
```

**503 Service Unavailable** - Export not enabled:

```json
{
  "error": "Video export is not currently available.",
  "help": "Set VIDEO_EXPORT_ENABLED=true and configure a background worker to process export jobs."
}
```

### GET /api/export

Check the status of an export job.

**Query Parameters:**

| Parameter | Type | Required | Description   |
| --------- | ---- | -------- | ------------- |
| jobId     | UUID | Yes      | Export job ID |

**Request:**

```http
GET /api/export?jobId=job-uuid
```

**Response (200) - Queued:**

```json
{
  "jobId": "job-uuid",
  "status": "queued",
  "message": "Export queued for processing",
  "estimatedTime": 30
}
```

**Response (200) - Processing:**

```json
{
  "jobId": "job-uuid",
  "status": "processing",
  "message": "Export in progress (65%)",
  "estimatedTime": 30
}
```

**Response (200) - Completed:**

```json
{
  "jobId": "job-uuid",
  "status": "completed",
  "message": "Export completed successfully"
}
```

**Response (200) - Failed:**

```json
{
  "jobId": "job-uuid",
  "status": "failed",
  "message": "Export failed: Codec not supported"
}
```

**TypeScript Example:**

```typescript
interface Clip {
  id: string;
  assetId: string;
  start: number;
  end: number;
  timelinePosition: number;
  trackIndex: number;
  volume?: number;
  opacity?: number;
  speed?: number;
  transitionToNext?: {
    type: 'crossfade' | 'fade-in' | 'fade-out';
    duration: number;
  };
}

const exportVideo = async (projectId: string, clips: Clip[]) => {
  // Step 1: Submit export request
  const response = await fetch('/api/export', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      projectId,
      timeline: { clips },
      outputSpec: {
        width: 1920,
        height: 1080,
        fps: 30,
        vBitrateK: 5000,
        aBitrateK: 192,
        format: 'mp4',
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Export failed');
  }

  const { jobId, estimatedTime } = await response.json();
  console.log(`Export started. Estimated time: ${estimatedTime}s`);

  // Step 2: Poll for completion
  const checkStatus = async () => {
    const statusResponse = await fetch(`/api/export?jobId=${jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return await statusResponse.json();
  };

  // Wait with exponential backoff
  let delay = 5000;
  const maxDelay = 30000;

  while (true) {
    await new Promise((resolve) => setTimeout(resolve, delay));

    const status = await checkStatus();

    if (status.status === 'completed') {
      console.log('Export completed!');
      return status;
    }

    if (status.status === 'failed') {
      throw new Error(status.message);
    }

    console.log(status.message);
    delay = Math.min(delay * 1.2, maxDelay);
  }
};

// Usage example
const clips: Clip[] = [
  {
    id: 'clip-1',
    assetId: 'asset-123',
    start: 0,
    end: 5000,
    timelinePosition: 0,
    trackIndex: 0,
    volume: 1.0,
    transitionToNext: {
      type: 'crossfade',
      duration: 500,
    },
  },
  {
    id: 'clip-2',
    assetId: 'asset-456',
    start: 2000,
    end: 7000,
    timelinePosition: 4500,
    trackIndex: 0,
    volume: 0.8,
  },
];

try {
  await exportVideo('project-123', clips);
} catch (error) {
  console.error('Export failed:', error.message);
}
```

**Example with Advanced Options:**

```typescript
const exportWithTransitions = async (projectId: string) => {
  const clips: Clip[] = [
    {
      id: 'intro',
      assetId: 'intro-asset',
      start: 0,
      end: 3000,
      timelinePosition: 0,
      trackIndex: 0,
      transitionToNext: {
        type: 'fade-out',
        duration: 1000,
      },
    },
    {
      id: 'main',
      assetId: 'main-asset',
      start: 0,
      end: 10000,
      timelinePosition: 2000,
      trackIndex: 0,
      speed: 1.5, // Play at 1.5x speed
      volume: 0.8,
      transitionToNext: {
        type: 'crossfade',
        duration: 1500,
      },
    },
    {
      id: 'outro',
      assetId: 'outro-asset',
      start: 0,
      end: 4000,
      timelinePosition: 10500,
      trackIndex: 0,
      opacity: 0.9,
    },
  ];

  return await exportVideo(projectId, clips);
};
```

---

## Subscription Management

### POST /api/stripe/checkout

Create a Stripe checkout session for subscription.

**Authentication**: Required

**Rate Limit**: Tier 1 (5/min)

**Request:**

```json
{
  "priceId": "price_1234567890abcdef"
}
```

**Parameters:**

| Parameter | Type   | Required | Description                                        |
| --------- | ------ | -------- | -------------------------------------------------- |
| priceId   | string | No       | Stripe price ID (uses env default if not provided) |

**Success Response (200):**

```json
{
  "sessionId": "cs_test_1234567890abcdefghijklmnop",
  "url": "https://checkout.stripe.com/c/pay/cs_test_1234567890abcdefghijklmnop"
}
```

**Error Responses:**

**400 Bad Request** - Already subscribed:

```json
{
  "error": "User already has an active subscription"
}
```

**401 Unauthorized**:

```json
{
  "error": "Unauthorized"
}
```

**500 Internal Server Error** - Stripe error:

```json
{
  "error": "Failed to create checkout session"
}
```

**TypeScript Example:**

```typescript
const createSubscription = async (priceId?: string) => {
  const response = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...(priceId && { priceId }),
    }),
  });

  if (!response.ok) {
    const error = await response.json();

    if (response.status === 400 && error.error.includes('already has')) {
      throw new Error('You already have an active subscription');
    }

    throw new Error(error.error || 'Failed to create checkout session');
  }

  const { url } = await response.json();

  // Redirect to Stripe checkout
  window.location.href = url;
};

// Usage
try {
  await createSubscription('price_premium_monthly');
} catch (error) {
  if (error.message.includes('already have')) {
    alert('You are already subscribed to a plan');
  } else {
    console.error('Subscription error:', error.message);
  }
}
```

### POST /api/stripe/portal

Create a Stripe billing portal session.

**Authentication**: Required

**Rate Limit**: Tier 1 (5/min)

**Success Response (200):**

```json
{
  "url": "https://billing.stripe.com/p/session/test_1234567890"
}
```

**TypeScript Example:**

```typescript
const openBillingPortal = async () => {
  const response = await fetch('/api/stripe/portal', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const { url } = await response.json();
  window.location.href = url;
};
```

---

## Project Management

### DELETE /api/projects/[projectId]

Delete a project and all associated resources.

**Authentication**: Required

**Rate Limit**: Tier 2 (10/min)

**Success Response (200):**

```json
{
  "success": true
}
```

**Error Responses:**

**400 Bad Request** - Invalid project ID:

```json
{
  "error": "Invalid project ID format",
  "field": "projectId"
}
```

**403 Forbidden** - Not project owner:

```json
{
  "error": "Access denied"
}
```

**404 Not Found** - Project doesn't exist:

```json
{
  "error": "Project not found"
}
```

**TypeScript Example:**

```typescript
const deleteProject = async (projectId: string) => {
  // Confirm deletion
  if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
    return;
  }

  const response = await fetch(`/api/projects/${projectId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete project');
  }

  return await response.json();
};

// Usage
try {
  await deleteProject('project-123');
  console.log('Project deleted successfully');
  // Redirect to projects list
  window.location.href = '/projects';
} catch (error) {
  console.error('Delete failed:', error.message);
}
```

### POST /api/auth/signout

Sign out the current user.

**Authentication**: Required

**Rate Limit**: Tier 1 (5/min)

**Success Response (200):**

```json
{
  "success": true
}
```

**TypeScript Example:**

```typescript
const signOut = async () => {
  const response = await fetch('/api/auth/signout', {
    method: 'POST',
    credentials: 'include',
  });

  if (response.ok) {
    window.location.href = '/login';
  }
};
```

---

## Activity History

### GET /api/history

Retrieve user's activity history with pagination.

**Authentication**: Required

**Rate Limit**: Tier 3 (30/min)

**Query Parameters:**

| Parameter | Type    | Required | Description                          |
| --------- | ------- | -------- | ------------------------------------ |
| limit     | integer | No       | Number of items (1-100, default: 50) |
| offset    | integer | No       | Offset for pagination (default: 0)   |

**Request:**

```http
GET /api/history?limit=20&offset=0
```

**Success Response (200):**

```json
{
  "history": [
    {
      "id": "history-uuid-1",
      "user_id": "user-uuid",
      "project_id": "project-uuid",
      "activity_type": "video_generation",
      "title": "Video Generated",
      "description": "Generated video using veo",
      "model": "veo",
      "asset_id": "asset-uuid",
      "metadata": {
        "prompt": "A serene lake at sunset",
        "duration": 5
      },
      "created_at": "2025-10-24T12:00:00.000Z"
    },
    {
      "id": "history-uuid-2",
      "activity_type": "image_upload",
      "title": "Image Uploaded",
      "description": "Uploaded image.jpg",
      "created_at": "2025-10-24T11:30:00.000Z"
    }
  ],
  "count": 20
}
```

**Activity Types:**

- `video_generation`
- `audio_generation`
- `image_upload`
- `video_upload`
- `audio_upload`
- `frame_edit`
- `video_upscale`

**TypeScript Example:**

```typescript
const getActivityHistory = async (limit = 20, offset = 0) => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const response = await fetch(`/api/history?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  return data.history;
};

// Usage with pagination
const loadAllHistory = async () => {
  const pageSize = 50;
  let offset = 0;
  let allHistory = [];

  while (true) {
    const page = await getActivityHistory(pageSize, offset);

    if (page.length === 0) break;

    allHistory = [...allHistory, ...page];
    offset += pageSize;

    if (page.length < pageSize) break; // Last page
  }

  return allHistory;
};
```

### DELETE /api/history

Clear all activity history for the current user.

**Authentication**: Required

**Rate Limit**: Tier 1 (5/min)

**Success Response (200):**

```json
{
  "message": "Activity history cleared"
}
```

**TypeScript Example:**

```typescript
const clearHistory = async () => {
  if (!confirm('Are you sure you want to clear all activity history?')) {
    return;
  }

  const response = await fetch('/api/history', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.ok) {
    console.log('History cleared successfully');
  }
};
```

---

## Account Management

### DELETE /api/user/delete-account

Permanently delete user account and all associated data.

**Authentication**: Required

**Rate Limit**: Tier 1 (5/min)

**Warning**: This operation is irreversible!

**Success Response (200):**

```json
{
  "message": "Account successfully deleted"
}
```

**What Gets Deleted:**

1. All user projects (cascades to assets, clips, frames)
2. User subscription data
3. User activity history
4. User roles
5. Storage files (assets, frames)
6. User account

**Error Responses:**

**401 Unauthorized**:

```json
{
  "error": "Unauthorized"
}
```

**500 Internal Server Error**:

```json
{
  "error": "Account deletion failed"
}
```

**TypeScript Example:**

```typescript
const deleteAccount = async () => {
  // Double confirmation
  const confirmDelete = confirm(
    'Are you absolutely sure you want to delete your account? ' +
      'This will permanently delete all your projects, assets, and data. ' +
      'This action CANNOT be undone.'
  );

  if (!confirmDelete) return;

  const secondConfirm = confirm(
    'This is your last chance. Type DELETE to confirm account deletion.'
  );

  if (!secondConfirm) return;

  try {
    const response = await fetch('/api/user/delete-account', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Account deletion failed');
    }

    // Account deleted successfully
    alert('Your account has been permanently deleted.');
    window.location.href = '/';
  } catch (error) {
    console.error('Account deletion error:', error.message);
    alert(`Failed to delete account: ${error.message}`);
  }
};
```

**Example with Input Confirmation:**

```typescript
const deleteAccountWithInput = async () => {
  const userInput = prompt('To delete your account, type "DELETE" (all capitals):');

  if (userInput !== 'DELETE') {
    alert('Account deletion cancelled.');
    return;
  }

  const response = await fetch('/api/user/delete-account', {
    method: 'DELETE',
    credentials: 'include',
  });

  if (response.ok) {
    alert('Account deleted successfully.');
    window.location.href = '/';
  } else {
    const error = await response.json();
    alert(`Deletion failed: ${error.error}`);
  }
};
```

---

## Complete Workflow Examples

### Workflow 1: Generate Video with Audio and Export

```typescript
const createVideoWithAudioAndExport = async () => {
  try {
    // Step 1: Create project
    const project = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'My Video Project',
      }),
    }).then((r) => r.json());

    console.log('Project created:', project.id);

    // Step 2: Generate video with audio
    const videoGenResponse = await fetch('/api/video/generate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'A beautiful mountain landscape at sunrise',
        projectId: project.id,
        model: 'veo-3.1-generate-preview',
        duration: 5,
        aspectRatio: '16:9',
        resolution: '1080p',
        generateAudio: true,
      }),
    }).then((r) => r.json());

    console.log('Video generation started');

    // Step 3: Wait for video completion
    const videoAsset = await waitForVideoCompletion(videoGenResponse.operationName, project.id);

    console.log('Video ready:', videoAsset.id);

    // Step 4: Export the video
    const exportResponse = await fetch('/api/export', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: project.id,
        timeline: {
          clips: [
            {
              id: 'clip-1',
              assetId: videoAsset.id,
              start: 0,
              end: 5000,
              timelinePosition: 0,
              trackIndex: 0,
            },
          ],
        },
        outputSpec: {
          width: 1920,
          height: 1080,
          fps: 30,
          vBitrateK: 5000,
          aBitrateK: 192,
          format: 'mp4',
        },
      }),
    }).then((r) => r.json());

    console.log('Export started:', exportResponse.jobId);

    // Step 5: Poll export status
    const pollExport = async () => {
      const status = await fetch(`/api/export?jobId=${exportResponse.jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json());

      return status;
    };

    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const status = await pollExport();

      console.log(status.message);

      if (status.status === 'completed') {
        console.log('Export complete!');
        break;
      }

      if (status.status === 'failed') {
        throw new Error(status.message);
      }
    }

    return { project, videoAsset, exportJobId: exportResponse.jobId };
  } catch (error) {
    console.error('Workflow failed:', error.message);
    throw error;
  }
};
```

### Workflow 2: Upload Video, Detect Scenes, and Upscale

```typescript
const processUploadedVideo = async (videoFile: File, projectId: string) => {
  try {
    // Step 1: Upload video
    const formData = new FormData();
    formData.append('file', videoFile);
    formData.append('projectId', projectId);
    formData.append('type', 'video');

    const uploadResponse = await fetch('/api/assets/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }).then((r) => r.json());

    console.log('Video uploaded:', uploadResponse.assetId);

    // Step 2: Detect scenes
    const scenesResponse = await fetch('/api/video/split-scenes', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assetId: uploadResponse.assetId,
        projectId,
      }),
    }).then((r) => r.json());

    console.log(`Detected ${scenesResponse.count} scenes`);

    // Step 3: Upscale video
    const upscaleResponse = await fetch('/api/video/upscale', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assetId: uploadResponse.assetId,
        projectId,
        upscaleFactor: 2,
      }),
    }).then((r) => r.json());

    console.log('Upscaling started:', upscaleResponse.requestId);

    // Step 4: Wait for upscale
    let delay = 5000;
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, delay));

      const statusResponse = await fetch(
        `/api/video/upscale-status?requestId=${upscaleResponse.requestId}&projectId=${projectId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      ).then((r) => r.json());

      if (statusResponse.done) {
        if (statusResponse.error) {
          throw new Error(statusResponse.error);
        }
        console.log('Upscaling complete!');
        return {
          originalAsset: uploadResponse.assetId,
          upscaledAsset: statusResponse.asset,
          scenes: scenesResponse.scenes,
        };
      }

      console.log(`Upscaling progress: ${statusResponse.progress}%`);
      delay = Math.min(delay * 1.2, 30000);
    }
  } catch (error) {
    console.error('Video processing failed:', error.message);
    throw error;
  }
};
```

---

## Best Practices

### 1. Always Handle Service Unavailability

```typescript
// Good - Check for 503 errors
try {
  const scenes = await detectScenes(assetId, projectId);
} catch (error) {
  if (error.message.includes('not configured')) {
    showUserMessage(
      'Scene detection is not available. Please contact support to enable this feature.'
    );
  } else {
    showUserMessage('An error occurred. Please try again.');
  }
}
```

### 2. Implement Proper Polling

```typescript
// Good - Exponential backoff with max delay
let delay = 5000;
const maxDelay = 30000;

while (!done) {
  await sleep(delay);
  const status = await checkStatus();
  delay = Math.min(delay * 1.2, maxDelay);
}
```

### 3. Validate Inputs Client-Side

```typescript
// Good - Validate before API call
const exportVideo = async (clips: Clip[]) => {
  // Validate clips
  for (const clip of clips) {
    if (clip.end <= clip.start) {
      throw new Error('Clip end time must be greater than start time');
    }
  }

  // Proceed with API call
  const response = await fetch('/api/export', {
    method: 'POST',
    body: JSON.stringify({ timeline: { clips }, ... })
  });
};
```

### 4. Provide User Feedback

```typescript
// Good - Show progress to user
const upscaleWithProgress = async (assetId: string, projectId: string) => {
  showMessage('Starting upscale...');

  const { requestId } = await submitUpscale(assetId, projectId);

  while (true) {
    const status = await checkUpscaleStatus(requestId, projectId);

    if (status.done) {
      showMessage('Upscale complete!');
      return status.asset;
    }

    updateProgressBar(status.progress);
    await sleep(5000);
  }
};
```

---

## Error Handling Patterns

### Comprehensive Error Handler

```typescript
class APIClient {
  async request(url: string, options: RequestInit) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific status codes
        switch (response.status) {
          case 400:
            throw new ValidationError(data.error, data.field);
          case 401:
            this.handleUnauthorized();
            throw new AuthError('Please log in to continue');
          case 403:
            throw new AuthError('You do not have permission');
          case 404:
            throw new NotFoundError(data.error);
          case 429:
            throw new RateLimitError(data);
          case 503:
            throw new ServiceUnavailableError(data.error, data.message);
          default:
            throw new APIError(data.error || 'Request failed');
        }
      }

      return data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new NetworkError('Network error occurred');
    }
  }
}
```

---

For more examples, see:

- [API_EXAMPLES.md](./API_EXAMPLES.md) - Basic usage examples
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - Full API reference
- [API_QUICK_START.md](./API_QUICK_START.md) - Quick start guide
