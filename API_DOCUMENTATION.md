# API Documentation

> **Non-Linear Video Editor API Reference**
>
> Version: 1.0.0
> Last Updated: 2025-10-23

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication-endpoints)
  - [Projects](#projects)
  - [Assets](#assets)
  - [Video Generation](#video-generation)
  - [Image Generation](#image-generation)
  - [Audio Generation](#audio-generation)
  - [AI Chat](#ai-chat)
  - [Export](#export)
  - [History](#history)
  - [Admin](#admin)
  - [Stripe/Payments](#stripe-payments)
  - [User Management](#user-management)
- [Webhooks](#webhooks)
- [Appendix](#appendix)

---

## Overview

The Non-Linear Video Editor API provides a comprehensive set of endpoints for managing video editing projects, generating AI content (videos, images, audio), and handling user subscriptions.

### Base URL

```
https://your-domain.com/api
```

### Content Types

All API requests and responses use JSON unless otherwise specified:

```
Content-Type: application/json
```

For file uploads, use:

```
Content-Type: multipart/form-data
```

---

## Authentication

All API endpoints (except webhooks and public routes) require authentication via session cookies.

### Authentication Method

Session-based authentication using Supabase Auth. Users must be signed in, and the session cookie `supabase-auth-token` must be present in the request.

### Authentication Header

```http
Cookie: supabase-auth-token=<session-token>
```

### Unauthorized Response

If authentication fails, the API returns:

```json
{
  "error": "Unauthorized"
}
```

**Status Code:** `401 Unauthorized`

---

## Rate Limiting

The API implements a tiered rate limiting system to prevent abuse and ensure fair resource allocation.

### Rate Limit Tiers

| Tier   | Limit       | Window   | Use Case                                                  |
| ------ | ----------- | -------- | --------------------------------------------------------- |
| Tier 1 | 5 requests  | 1 minute | Authentication, payments, account deletion                |
| Tier 2 | 10 requests | 1 minute | Resource creation (video/image/audio generation, uploads) |
| Tier 3 | 30 requests | 1 minute | Status checks, read operations                            |
| Tier 4 | 60 requests | 1 minute | General API operations                                    |

### Rate Limit Headers

When rate limited, the API returns these headers:

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1698123456789
```

### Rate Limit Response

```json
{
  "error": "Rate limit exceeded",
  "limit": 10,
  "remaining": 0,
  "resetAt": 1698123456789
}
```

**Status Code:** `429 Too Many Requests`

---

## Error Handling

### Standard Error Response

```json
{
  "error": "Error message",
  "field": "fieldName"
}
```

### HTTP Status Codes

| Code | Meaning                            |
| ---- | ---------------------------------- |
| 200  | Success                            |
| 201  | Created                            |
| 202  | Accepted (async operation started) |
| 400  | Bad Request (validation error)     |
| 401  | Unauthorized                       |
| 403  | Forbidden                          |
| 404  | Not Found                          |
| 413  | Payload Too Large                  |
| 415  | Unsupported Media Type             |
| 429  | Too Many Requests                  |
| 500  | Internal Server Error              |
| 503  | Service Unavailable                |
| 504  | Gateway Timeout                    |

---

## API Endpoints

### Authentication Endpoints

#### Sign Out

Sign out the currently authenticated user.

**Endpoint:** `POST /api/auth/signout`

**Authentication:** Required

**Rate Limit:** Tier 1 (5/min)

**Request:**

```http
POST /api/auth/signout
Cookie: supabase-auth-token=<token>
```

**Response:**

```json
{
  "success": true
}
```

**Error Responses:**

- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - Invalid origin (CSRF protection)
- `500 Internal Server Error` - Sign out failed

---

### Projects

#### Create Project

Create a new video editing project.

**Endpoint:** `POST /api/projects`

**Authentication:** Required

**Rate Limit:** Tier 2 (10/min)

**Request:**

```json
{
  "title": "My Video Project"
}
```

**Parameters:**

| Parameter | Type   | Required | Description                                              |
| --------- | ------ | -------- | -------------------------------------------------------- |
| title     | string | No       | Project title (1-200 chars). Default: "Untitled Project" |

**Response:**

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "My Video Project",
  "user_id": "user-uuid",
  "timeline_state_jsonb": {},
  "created_at": "2025-10-23T12:00:00.000Z",
  "updated_at": "2025-10-23T12:00:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid title
- `401 Unauthorized` - User not authenticated
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Database error

---

### Assets

#### List Assets

Retrieve assets for a project with pagination.

**Endpoint:** `GET /api/assets`

**Authentication:** Required

**Rate Limit:** Tier 3 (30/min)

**Query Parameters:**

| Parameter | Type    | Required | Description                               |
| --------- | ------- | -------- | ----------------------------------------- |
| projectId | UUID    | No       | Filter by project ID                      |
| type      | string  | No       | Filter by type: 'image', 'video', 'audio' |
| page      | integer | No       | Page number (0-based). Default: 0         |
| pageSize  | integer | No       | Items per page (1-100). Default: 50       |

**Request:**

```http
GET /api/assets?projectId=123e4567-e89b-12d3-a456-426614174000&type=video&page=0&pageSize=20
```

**Response:**

```json
{
  "assets": [
    {
      "id": "asset-uuid",
      "project_id": "project-uuid",
      "user_id": "user-uuid",
      "type": "video",
      "source": "upload",
      "storage_url": "supabase://assets/...",
      "metadata": {},
      "created_at": "2025-10-23T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 0,
    "pageSize": 20,
    "totalCount": 100,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - User not authenticated
- `429 Too Many Requests` - Rate limit exceeded

---

#### Upload Asset

Upload a media file (image, video, or audio).

**Endpoint:** `POST /api/assets/upload`

**Authentication:** Required

**Rate Limit:** Tier 2 (10/min)

**Content Type:** `multipart/form-data`

**Request:**

```http
POST /api/assets/upload
Content-Type: multipart/form-data

file: <binary-data>
projectId: "123e4567-e89b-12d3-a456-426614174000"
type: "video"
```

**Parameters:**

| Parameter | Type   | Required | Description                           |
| --------- | ------ | -------- | ------------------------------------- |
| file      | File   | Yes      | File to upload (max 100MB)            |
| projectId | UUID   | Yes      | Project ID                            |
| type      | string | Yes      | Asset type: 'image', 'video', 'audio' |

**Allowed MIME Types:**

- **Image:** image/jpeg, image/png, image/gif, image/webp, image/avif
- **Video:** video/mp4, video/webm, video/quicktime, video/x-msvideo
- **Audio:** audio/mpeg, audio/wav, audio/ogg, audio/webm

**Response:**

```json
{
  "assetId": "789e4567-e89b-12d3-a456-426614174000",
  "storageUrl": "supabase://assets/user-id/project-id/video/uuid.mp4",
  "publicUrl": "https://storage.example.com/assets/user-id/project-id/video/uuid.mp4",
  "success": true
}
```

**Error Responses:**

- `400 Bad Request` - No file, invalid project ID, or invalid type
- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User doesn't own the project
- `413 Payload Too Large` - File exceeds 100MB
- `415 Unsupported Media Type` - Invalid MIME type
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Storage or database error

---

#### Sign Asset URL

Generate a signed URL for asset download (if implemented).

**Endpoint:** `POST /api/assets/sign`

**Authentication:** Required

**Request:**

```json
{
  "assetId": "asset-uuid",
  "expiresIn": 3600
}
```

---

### Video Generation

#### Generate Video

Generate a video from text or image using AI models.

**Endpoint:** `POST /api/video/generate`

**Authentication:** Required

**Rate Limit:** Tier 2 (10/min)

**Supported Models:**

- `veo-3.1-generate-preview` (Google Veo, with audio)
- `veo-3.1-fast-generate-preview` (Google Veo Fast, with audio)
- `veo-2.0-generate-001` (Google Veo v2, no audio)
- `seedance-1.0-pro` (FAL.ai Seedance)
- `minimax-hailuo-02-pro` (FAL.ai MiniMax)

**Request:**

```json
{
  "prompt": "A serene lake at sunset with mountains in the background",
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "model": "veo-3.1-generate-preview",
  "duration": 5,
  "aspectRatio": "16:9",
  "resolution": "1080p",
  "generateAudio": true,
  "imageAssetId": "optional-image-uuid"
}
```

**Parameters:**

| Parameter          | Type    | Required | Description                              |
| ------------------ | ------- | -------- | ---------------------------------------- |
| prompt             | string  | Yes      | Text description (3-1000 chars)          |
| projectId          | UUID    | Yes      | Project ID                               |
| model              | string  | Yes      | AI model to use                          |
| aspectRatio        | string  | No       | '16:9', '9:16', '1:1', '4:3', '3:4'      |
| duration           | number  | No       | Duration in seconds (1-10)               |
| resolution         | string  | No       | '480p', '720p', '1080p'                  |
| negativePrompt     | string  | No       | What to avoid (max 1000 chars)           |
| personGeneration   | string  | No       | 'dont_allow', 'allow_adult', 'allow_all' |
| enhancePrompt      | boolean | No       | AI prompt enhancement                    |
| generateAudio      | boolean | No       | Generate audio (Veo only)                |
| seed               | number  | No       | Random seed (0-2147483647)               |
| sampleCount        | number  | No       | Number of variations (1-4)               |
| compressionQuality | number  | No       | Video quality (0-100, Veo only)          |
| imageAssetId       | UUID    | No       | Image for image-to-video                 |

**Response:**

```json
{
  "operationName": "projects/123/locations/us-central1/operations/456",
  "status": "processing",
  "message": "Video generation started. Use the operation name to check status."
}
```

**Error Responses:**

- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - Project access denied
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Generation failed

---

#### Check Video Status

Poll the status of a video generation operation.

**Endpoint:** `GET /api/video/status`

**Authentication:** Required

**Rate Limit:** Tier 3 (30/min)

**Query Parameters:**

| Parameter     | Type   | Required | Description                           |
| ------------- | ------ | -------- | ------------------------------------- |
| operationName | string | Yes      | Operation ID from /api/video/generate |
| projectId     | UUID   | Yes      | Project ID                            |

**Request:**

```http
GET /api/video/status?operationName=projects/123/locations/us-central1/operations/456&projectId=proj-uuid
```

**Response (Processing):**

```json
{
  "done": false,
  "progress": 45
}
```

**Response (Complete):**

```json
{
  "done": true,
  "asset": {
    "id": "asset-uuid",
    "type": "video",
    "storage_url": "supabase://assets/...",
    "metadata": {
      "filename": "uuid.mp4",
      "mimeType": "video/mp4",
      "sourceUrl": "https://...",
      "generator": "veo"
    }
  },
  "storageUrl": "https://storage.example.com/..."
}
```

**Response (Error):**

```json
{
  "done": true,
  "error": "Error message"
}
```

**Error Responses:**

- `400 Bad Request` - Missing operationName or projectId
- `401 Unauthorized` - User not authenticated
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Download or storage error

---

#### Other Video Endpoints

- `POST /api/video/upscale` - Upscale video quality
- `GET /api/video/upscale-status` - Check upscale status
- `POST /api/video/generate-audio` - Generate audio for video
- `GET /api/video/generate-audio-status` - Check audio generation status
- `POST /api/video/split-scenes` - Split video into scenes
- `POST /api/video/split-audio` - Extract audio from video

---

### Image Generation

#### Generate Image

Generate images from text using Google Imagen 3.

**Endpoint:** `POST /api/image/generate`

**Authentication:** Required

**Rate Limit:** Tier 2 (10/min)

**Request:**

```json
{
  "prompt": "A photorealistic cat wearing sunglasses on a beach",
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "aspectRatio": "16:9",
  "sampleCount": 2,
  "safetyFilterLevel": "block_some",
  "personGeneration": "dont_allow"
}
```

**Parameters:**

| Parameter         | Type    | Required | Description                                       |
| ----------------- | ------- | -------- | ------------------------------------------------- |
| prompt            | string  | Yes      | Text description (3-1000 chars)                   |
| projectId         | UUID    | Yes      | Project ID                                        |
| model             | string  | No       | Imagen model (default: 'imagen-3.0-generate-001') |
| aspectRatio       | string  | No       | '1:1', '3:4', '4:3', '9:16', '16:9'               |
| negativePrompt    | string  | No       | What to avoid (max 1000 chars)                    |
| sampleCount       | number  | No       | Number of images (1-8)                            |
| seed              | number  | No       | Random seed (0-2147483647)                        |
| safetyFilterLevel | string  | No       | 'block_most', 'block_some', 'block_few'           |
| personGeneration  | string  | No       | 'dont_allow', 'allow_adult', 'allow_all'          |
| addWatermark      | boolean | No       | Add watermark                                     |
| language          | string  | No       | Language code (e.g., 'en', 'es')                  |
| outputMimeType    | string  | No       | 'image/png' or 'image/jpeg'                       |

**Response:**

```json
{
  "assets": [
    {
      "id": "asset-uuid-1",
      "project_id": "123e4567-e89b-12d3-a456-426614174000",
      "type": "image",
      "storage_url": "supabase://assets/user-id/project-id/images/imagen_1234_0.png",
      "metadata": {
        "filename": "imagen_1234_0.png",
        "mimeType": "image/png",
        "sourceUrl": "https://...",
        "provider": "imagen",
        "model": "imagen-3.0-generate-001",
        "prompt": "A photorealistic cat..."
      }
    }
  ],
  "message": "Generated 2 image(s) successfully"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - Project access denied
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Generation failed

---

### Audio Generation

#### Generate Speech (ElevenLabs)

Generate speech from text using ElevenLabs TTS.

**Endpoint:** `POST /api/audio/elevenlabs/generate`

**Authentication:** Required

**Rate Limit:** Tier 2 (10/min)

**Request:**

```json
{
  "text": "Hello, this is a test of text-to-speech generation.",
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "voiceId": "EXAVITQu4vr4xnSDxMaL",
  "stability": 0.6,
  "similarity": 0.8
}
```

**Parameters:**

| Parameter  | Type   | Required | Description                                           |
| ---------- | ------ | -------- | ----------------------------------------------------- |
| text       | string | Yes      | Text to speak (1-5000 chars)                          |
| projectId  | UUID   | Yes      | Project ID                                            |
| voiceId    | string | No       | ElevenLabs voice ID (default: 'EXAVITQu4vr4xnSDxMaL') |
| modelId    | string | No       | Model ID (default: 'eleven_multilingual_v2')          |
| stability  | number | No       | Voice stability (0-1, default: 0.5)                   |
| similarity | number | No       | Similarity boost (0-1, default: 0.75)                 |

**Response:**

```json
{
  "success": true,
  "asset": {
    "id": "asset-uuid",
    "project_id": "123e4567-e89b-12d3-a456-426614174000",
    "type": "audio",
    "source": "genai",
    "storage_url": "supabase://assets/user-id/project-id/audio/elevenlabs_123.mp3",
    "metadata": {
      "filename": "elevenlabs_123.mp3",
      "provider": "elevenlabs",
      "voiceId": "EXAVITQu4vr4xnSDxMaL",
      "modelId": "eleven_multilingual_v2",
      "text": "Hello, this is a test..."
    }
  },
  "message": "Audio generated successfully"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - Project access denied
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - API key not configured
- `504 Gateway Timeout` - Request timeout (60s)

---

#### Get Available Voices

List available ElevenLabs voices.

**Endpoint:** `GET /api/audio/elevenlabs/voices`

**Authentication:** Required

**Rate Limit:** Tier 3 (30/min)

**Response:**

```json
{
  "voices": [
    {
      "voice_id": "EXAVITQu4vr4xnSDxMaL",
      "name": "Sarah",
      "category": "premade",
      "labels": {
        "accent": "american",
        "age": "young",
        "gender": "female"
      },
      "description": "Confident, clear female voice",
      "preview_url": "https://..."
    }
  ]
}
```

---

#### Generate Sound Effects

Generate sound effects using ElevenLabs SFX API.

**Endpoint:** `POST /api/audio/elevenlabs/sfx`

**Authentication:** Required

**Rate Limit:** Tier 2 (10/min)

**Request:**

```json
{
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "prompt": "Ocean waves crashing on a beach",
  "duration": 5.0
}
```

**Parameters:**

| Parameter | Type   | Required | Description                                |
| --------- | ------ | -------- | ------------------------------------------ |
| prompt    | string | Yes      | Sound description (3-500 chars)            |
| projectId | UUID   | Yes      | Project ID                                 |
| duration  | number | No       | Duration in seconds (0.5-22, default: 5.0) |

**Response:**

```json
{
  "success": true,
  "asset": {
    "id": "asset-uuid",
    "type": "audio",
    "storage_url": "supabase://assets/...",
    "metadata": {
      "provider": "elevenlabs-sfx",
      "prompt": "Ocean waves crashing on a beach",
      "duration": 5.0
    }
  },
  "url": "https://..."
}
```

---

#### Generate Music (Suno)

Generate music using Suno AI.

**Endpoint:** `POST /api/audio/suno/generate`

**Authentication:** Required

**Rate Limit:** Tier 2 (10/min)

**Request:**

```json
{
  "prompt": "Upbeat pop song about summer",
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "style": "pop, upbeat, energetic",
  "title": "Summer Vibes",
  "customMode": true,
  "instrumental": false
}
```

**Parameters:**

| Parameter    | Type    | Required    | Description                            |
| ------------ | ------- | ----------- | -------------------------------------- |
| prompt       | string  | Conditional | Description (required if !customMode)  |
| projectId    | UUID    | Yes         | Project ID                             |
| style        | string  | Conditional | Music style (required if customMode)   |
| title        | string  | No          | Song title (max 100 chars)             |
| customMode   | boolean | No          | Use custom mode (default: false)       |
| instrumental | boolean | No          | Generate instrumental (default: false) |

**Response:**

```json
{
  "taskId": "suno-task-id",
  "message": "Audio generation started"
}
```

---

#### Check Music Generation Status

**Endpoint:** `GET /api/audio/suno/status?taskId=<task-id>`

---

### AI Chat

#### Send Chat Message

Chat with AI assistant using Google Gemini.

**Endpoint:** `POST /api/ai/chat`

**Authentication:** Required

**Content Type:** `multipart/form-data`

**Request:**

```http
POST /api/ai/chat
Content-Type: multipart/form-data

message: "How do I create a video?"
model: "gemini-1.5-pro"
projectId: "123e4567-e89b-12d3-a456-426614174000"
chatHistory: "[{\"role\":\"user\",\"content\":\"Hello\"}]"
file-0: <optional-image-file>
```

**Parameters:**

| Parameter   | Type   | Required | Description                                     |
| ----------- | ------ | -------- | ----------------------------------------------- |
| message     | string | Yes      | User message (max 5000 chars)                   |
| model       | string | Yes      | Gemini model to use                             |
| projectId   | UUID   | Yes      | Project ID                                      |
| chatHistory | string | No       | JSON array of previous messages (max 50, 100KB) |
| file-\*     | File   | No       | Attached files (max 5 files, 10MB each)         |

**Allowed File Types:**

- image/jpeg, image/png, image/webp, application/pdf

**Response:**

```json
{
  "response": "AI assistant response text",
  "model": "gemini-1.5-pro",
  "timestamp": "2025-10-23T12:00:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid message, history, or file
- `401 Unauthorized` - User not authenticated
- `413 Payload Too Large` - File too large
- `503 Service Unavailable` - AI service not configured

---

### Export

#### Export Video

Export a video timeline to a file.

**Endpoint:** `POST /api/export`

**Authentication:** Required

**Note:** Requires `VIDEO_EXPORT_ENABLED=true` in environment variables.

**Request:**

```json
{
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "timeline": {
    "clips": [
      {
        "id": "clip-uuid",
        "assetId": "asset-uuid",
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

**Parameters:**

| Parameter            | Type    | Required | Description                       |
| -------------------- | ------- | -------- | --------------------------------- |
| projectId            | UUID    | Yes      | Project ID                        |
| timeline.clips       | array   | Yes      | Array of timeline clips           |
| outputSpec.width     | integer | Yes      | Video width (1-7680)              |
| outputSpec.height    | integer | Yes      | Video height (1-4320)             |
| outputSpec.fps       | integer | Yes      | Frame rate (1-120)                |
| outputSpec.vBitrateK | integer | Yes      | Video bitrate in Kbps (100-50000) |
| outputSpec.aBitrateK | integer | Yes      | Audio bitrate in Kbps (32-320)    |
| outputSpec.format    | string  | Yes      | Output format: 'mp4' or 'webm'    |

**Timeline Clip Properties:**

| Property         | Type    | Required | Description                      |
| ---------------- | ------- | -------- | -------------------------------- |
| id               | UUID    | Yes      | Clip ID                          |
| assetId          | UUID    | Yes      | Asset ID                         |
| start            | integer | Yes      | Start time in ms                 |
| end              | integer | Yes      | End time in ms (must be > start) |
| timelinePosition | integer | Yes      | Position on timeline in ms       |
| trackIndex       | integer | Yes      | Track index (0+)                 |
| volume           | number  | No       | Volume (0-2)                     |
| opacity          | number  | No       | Opacity (0-1)                    |
| speed            | number  | No       | Playback speed (1-10)            |
| transitionToNext | object  | No       | Transition settings              |

**Response:**

```json
{
  "jobId": "job-uuid",
  "status": "queued",
  "message": "Export job created and queued for processing.",
  "estimatedTime": 30
}
```

**Status Code:** `202 Accepted`

**Error Responses:**

- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - Project access denied
- `503 Service Unavailable` - Export not enabled

---

#### Check Export Status

**Endpoint:** `GET /api/export?jobId=<job-id>`

**Authentication:** Required

**Response:**

```json
{
  "jobId": "job-uuid",
  "status": "processing",
  "message": "Export in progress (45%)",
  "estimatedTime": 30
}
```

**Status Values:**

- `queued` - Job is queued
- `processing` - Currently rendering
- `completed` - Export complete
- `failed` - Export failed

---

### History

#### Get Activity History

Retrieve user's activity history with pagination.

**Endpoint:** `GET /api/history`

**Authentication:** Required

**Rate Limit:** Tier 3 (30/min)

**Query Parameters:**

| Parameter | Type    | Required | Description                          |
| --------- | ------- | -------- | ------------------------------------ |
| limit     | integer | No       | Number of items (1-100, default: 50) |
| offset    | integer | No       | Offset for pagination (default: 0)   |

**Request:**

```http
GET /api/history?limit=20&offset=0
```

**Response:**

```json
{
  "history": [
    {
      "id": "history-uuid",
      "user_id": "user-uuid",
      "project_id": "project-uuid",
      "activity_type": "video_generation",
      "title": "Video Generated",
      "description": "Generated video using veo",
      "model": "veo",
      "asset_id": "asset-uuid",
      "metadata": {},
      "created_at": "2025-10-23T12:00:00.000Z"
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

---

#### Add Activity Entry

Manually add an activity entry.

**Endpoint:** `POST /api/history`

**Authentication:** Required

**Request:**

```json
{
  "project_id": "project-uuid",
  "activity_type": "video_generation",
  "title": "Video Generated",
  "description": "Generated a 5-second video",
  "model": "veo",
  "asset_id": "asset-uuid",
  "metadata": {}
}
```

---

#### Clear Activity History

Delete all activity history for the current user.

**Endpoint:** `DELETE /api/history`

**Authentication:** Required

**Response:**

```json
{
  "message": "Activity history cleared"
}
```

---

### Admin

Admin endpoints require admin role authentication.

#### Get Cache Statistics

**Endpoint:** `GET /api/admin/cache`

**Authentication:** Required (Admin only)

**Rate Limit:** Tier 3 (30/min)

**Response:**

```json
{
  "cacheSize": 150,
  "hitRate": 0.85,
  "missRate": 0.15,
  "timestamp": "2025-10-23T12:00:00.000Z"
}
```

---

#### Clear All Caches

**Endpoint:** `DELETE /api/admin/cache`

**Authentication:** Required (Admin only)

**Rate Limit:** Tier 1 (5/min) - Destructive operation

**Response:**

```json
{
  "message": "All caches cleared successfully"
}
```

---

#### Change User Tier

**Endpoint:** `POST /api/admin/change-tier`

**Authentication:** Required (Admin only)

---

#### Delete User (Admin)

**Endpoint:** `DELETE /api/admin/delete-user`

**Authentication:** Required (Admin only)

---

### Stripe/Payments

#### Create Checkout Session

Create a Stripe checkout session for subscription.

**Endpoint:** `POST /api/stripe/checkout`

**Authentication:** Required

**Rate Limit:** Tier 1 (5/min)

**Request:**

```json
{
  "priceId": "price_1234567890"
}
```

**Parameters:**

| Parameter | Type   | Required | Description                                        |
| --------- | ------ | -------- | -------------------------------------------------- |
| priceId   | string | No       | Stripe price ID (uses env default if not provided) |

**Response:**

```json
{
  "sessionId": "cs_test_1234567890",
  "url": "https://checkout.stripe.com/c/pay/cs_test_1234567890"
}
```

**Error Responses:**

- `400 Bad Request` - User already has active subscription
- `401 Unauthorized` - User not authenticated
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Checkout creation failed

---

#### Create Billing Portal Session

**Endpoint:** `POST /api/stripe/portal`

**Authentication:** Required

**Response:**

```json
{
  "url": "https://billing.stripe.com/p/session/..."
}
```

---

### User Management

#### Delete Account

Permanently delete user account and all associated data.

**Endpoint:** `DELETE /api/user/delete-account`

**Authentication:** Required

**Rate Limit:** Tier 1 (5/min)

**Warning:** This operation is irreversible!

**Response:**

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

- `401 Unauthorized` - User not authenticated
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Deletion failed

---

## Webhooks

### Stripe Webhook

Handle Stripe webhook events for subscription management.

**Endpoint:** `POST /api/stripe/webhook`

**Authentication:** Stripe signature verification

**Headers:**

```http
stripe-signature: <stripe-signature>
```

**Supported Events:**

- `checkout.session.completed` - Subscription created
- `customer.subscription.updated` - Subscription updated
- `customer.subscription.deleted` - Subscription cancelled
- `customer.subscription.created` - New subscription

**Response:**

```json
{
  "received": true
}
```

**Error Responses:**

- `400 Bad Request` - Invalid signature or request
- `503 Service Unavailable` - Webhook secret not configured
- `500 Internal Server Error` - Processing failed (triggers Stripe retry)

---

## Appendix

### Common Data Types

#### UUID Format

All UUIDs follow the standard v4 format:

```
123e4567-e89b-12d3-a456-426614174000
```

#### Timestamp Format

All timestamps are in ISO 8601 format:

```
2025-10-23T12:00:00.000Z
```

#### Storage URL Format

Internal storage URLs use this format:

```
supabase://bucket-name/path/to/file
```

Public URLs are HTTPS:

```
https://storage.example.com/bucket-name/path/to/file
```

---

### Validation Rules

#### String Validation

- Prompt: 3-1000 characters
- Title: 1-200 characters
- Negative Prompt: Max 1000 characters
- Voice ID: Alphanumeric, 1-100 characters

#### Number Validation

- Seed: 0-2147483647
- Sample Count: 1-8 (images), 1-4 (videos)
- Stability/Similarity: 0-1
- Duration: Varies by service (typically 0.5-22 seconds)

#### Aspect Ratios

Supported aspect ratios:

- `1:1` - Square
- `16:9` - Widescreen
- `9:16` - Portrait
- `4:3` - Classic TV
- `3:4` - Portrait classic

---

### Environment Variables

Required environment variables for API functionality:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google AI
GOOGLE_SERVICE_ACCOUNT=
GEMINI_API_KEY=

# ElevenLabs
ELEVENLABS_API_KEY=

# Suno/Comet
COMET_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PREMIUM_PRICE_ID=

# Features
VIDEO_EXPORT_ENABLED=true
```

---

### Response Headers

Common response headers:

```http
Content-Type: application/json
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1698123456789
```

---

### Best Practices

1. **Always handle rate limits** - Implement exponential backoff
2. **Use polling responsibly** - Check status endpoints at 5-10 second intervals
3. **Validate UUIDs** - Ensure all UUIDs are properly formatted before sending
4. **Handle timeouts** - Some operations (AI generation) can take 60+ seconds
5. **Check file sizes** - Respect the 100MB upload limit
6. **Use HTTPS** - All API calls must use HTTPS in production
7. **Store operation IDs** - Keep operation IDs for status polling
8. **Implement error handling** - Handle all error codes appropriately

---

### Example Workflows

#### Workflow 1: Generate and Use Video

1. `POST /api/video/generate` - Start generation
2. Store `operationName` from response
3. Poll `GET /api/video/status` every 5-10 seconds
4. When `done: true`, retrieve asset from response
5. Use asset in timeline

#### Workflow 2: Upload and Process Media

1. `POST /api/assets/upload` - Upload file
2. Receive `assetId` in response
3. Use `assetId` in timeline or generation requests

#### Workflow 3: Create and Export Project

1. `POST /api/projects` - Create project
2. `POST /api/assets/upload` - Upload media
3. Build timeline with clips
4. `POST /api/export` - Export video
5. Poll `GET /api/export?jobId=...` for status

---

### Support

For API support and questions:

- Documentation: See inline route comments
- Issues: Check GitHub repository
- Rate Limits: Monitor response headers

---

**End of API Documentation**

_Last Updated: 2025-10-23_
