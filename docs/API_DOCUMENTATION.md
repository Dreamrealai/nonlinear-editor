# API Documentation

Comprehensive API documentation for the Non-Linear Video Editor application.

## Base URL

- Development: `http://localhost:3000`
- Production: `https://your-production-url.com`

## Authentication

All API endpoints (except public endpoints) require authentication via session cookie:

- Cookie Name: `supabase-auth-token`
- Type: HTTP-only session cookie
- Source: Supabase Auth

## Rate Limiting

The API implements a 3-tier rate limiting system:

### Tier 1: Standard Operations (60/min)
- General read operations
- Asset listing
- Project listing

### Tier 2: Resource Creation (10/min)
- Video generation
- Image generation
- Audio generation (TTS, SFX, Music)
- Asset uploads
- Project creation

### Tier 3: Status/Polling (30/min)
- Status checks for async operations
- Video generation status
- Audio generation status
- Export status

Rate limit headers are returned in all responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Common Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error",
  "message": "Invalid parameter value",
  "field": "parameterName"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "You don't have access to this resource"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded",
  "limit": 10,
  "remaining": 0,
  "resetAt": 1234567890
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Something went wrong"
}
```

## API Endpoints

### Projects

#### POST /api/projects
Create a new video editing project.

**Request:**
```json
{
  "title": "My Video Project"
}
```

**Response:**
```json
{
  "id": "uuid",
  "title": "My Video Project",
  "user_id": "user-uuid",
  "timeline_state_jsonb": {},
  "created_at": "2025-10-23T12:00:00.000Z",
  "updated_at": "2025-10-23T12:00:00.000Z"
}
```

**Rate Limit:** 10/min (Tier 2)

---

### Assets

#### POST /api/assets/upload
Upload a media file (image, video, or audio).

**Request:** `multipart/form-data`
- `file`: File (max 100MB)
- `projectId`: UUID
- `type`: 'image' | 'video' | 'audio'

**Allowed MIME Types:**
- Image: image/jpeg, image/png, image/gif, image/webp, image/avif
- Video: video/mp4, video/webm, video/quicktime, video/x-msvideo
- Audio: audio/mpeg, audio/wav, audio/ogg, audio/webm

**Response:**
```json
{
  "assetId": "uuid",
  "storageUrl": "supabase://assets/...",
  "publicUrl": "https://...",
  "success": true
}
```

**Rate Limit:** 10/min (Tier 2)

#### GET /api/assets
List all assets for a project.

**Query Parameters:**
- `projectId`: UUID (required)

**Response:**
```json
[
  {
    "id": "uuid",
    "project_id": "uuid",
    "type": "video",
    "storage_url": "supabase://...",
    "metadata": {},
    "created_at": "2025-10-23T12:00:00.000Z"
  }
]
```

**Rate Limit:** 60/min (Tier 1)

#### GET /api/assets/sign
Generate a temporary signed URL for asset access.

**Query Parameters:**
- `assetId`: UUID (optional)
- `storageUrl`: string (optional)

One of `assetId` or `storageUrl` must be provided.

**Response:**
```json
{
  "signedUrl": "https://storage.example.com/...",
  "expiresIn": 3600
}
```

**Rate Limit:** 60/min (Tier 1)

---

### Video Generation

#### POST /api/video/generate
Generate a video from text using AI (Google Veo, FAL.ai Seedance, or MiniMax).

**Request:**
```json
{
  "prompt": "A serene lake at sunset",
  "projectId": "uuid",
  "model": "veo-002",
  "duration": 5,
  "aspectRatio": "16:9",
  "resolution": "1080p",
  "negativePrompt": "blurry, low quality",
  "personGeneration": "dont_allow",
  "enhancePrompt": true,
  "generateAudio": false,
  "seed": 12345,
  "sampleCount": 1,
  "compressionQuality": 85,
  "imageAssetId": "uuid"
}
```

**Models:**
- `veo-002`: Google Veo 2 (slower, higher quality)
- `veo-003`: Google Veo 3 (fastest Google option)
- `seedance-1.0-pro`: FAL.ai Seedance (image-to-video specialist)
- `minimax-hailuo-02-pro`: MiniMax Hailuo (fast text-to-video)

**Response:**
```json
{
  "operationName": "projects/123/locations/us-central1/operations/456",
  "status": "processing",
  "message": "Video generation started..."
}
```

**Rate Limit:** 10/min (Tier 2)

#### GET /api/video/status
Check video generation status.

**Query Parameters:**
- `operationName`: string (from /api/video/generate)
- `projectId`: UUID

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
    "id": "uuid",
    "type": "video",
    "storage_url": "supabase://...",
    "metadata": {}
  },
  "storageUrl": "https://..."
}
```

**Rate Limit:** 30/min (Tier 3)

---

### Image Generation

#### POST /api/image/generate
Generate images from text using Google Imagen 3.

**Request:**
```json
{
  "prompt": "A photorealistic cat wearing sunglasses",
  "projectId": "uuid",
  "model": "imagen-3.0-generate-001",
  "aspectRatio": "16:9",
  "sampleCount": 2,
  "negativePrompt": "cartoon, anime",
  "safetyFilterLevel": "block_some",
  "personGeneration": "dont_allow",
  "seed": 12345,
  "addWatermark": false,
  "language": "en",
  "outputMimeType": "image/png"
}
```

**Response:**
```json
{
  "assets": [
    {
      "id": "uuid",
      "type": "image",
      "storage_url": "supabase://...",
      "metadata": {
        "provider": "imagen",
        "prompt": "A photorealistic cat..."
      }
    }
  ],
  "message": "Generated 2 image(s) successfully"
}
```

**Rate Limit:** 10/min (Tier 2)

---

### Audio Generation

#### POST /api/audio/elevenlabs/generate
Generate speech from text using ElevenLabs TTS.

**Request:**
```json
{
  "text": "Hello, this is a test.",
  "projectId": "uuid",
  "voiceId": "EXAVITQu4vr4xnSDxMaL",
  "modelId": "eleven_multilingual_v2",
  "stability": 0.5,
  "similarity": 0.75
}
```

**Response:**
```json
{
  "success": true,
  "asset": {
    "id": "uuid",
    "type": "audio",
    "storage_url": "supabase://...",
    "metadata": {
      "provider": "elevenlabs",
      "voiceId": "EXAVITQu4vr4xnSDxMaL"
    }
  },
  "message": "Audio generated successfully"
}
```

**Rate Limit:** 10/min (Tier 2)

#### GET /api/audio/elevenlabs/voices
List available ElevenLabs voices.

**Response:**
```json
{
  "voices": [
    {
      "voice_id": "EXAVITQu4vr4xnSDxMaL",
      "name": "Sarah",
      "category": "premade"
    }
  ]
}
```

**Rate Limit:** 60/min (Tier 1)

#### POST /api/audio/elevenlabs/sfx
Generate sound effects using ElevenLabs.

**Request:**
```json
{
  "prompt": "Thunder and lightning",
  "projectId": "uuid",
  "duration": 5
}
```

**Response:**
```json
{
  "success": true,
  "asset": {
    "id": "uuid",
    "type": "audio",
    "storage_url": "supabase://..."
  }
}
```

**Rate Limit:** 10/min (Tier 2)

#### POST /api/audio/suno/generate
Generate music using Suno AI.

**Request:**
```json
{
  "prompt": "Upbeat electronic music for a tech video",
  "projectId": "uuid",
  "make_instrumental": false,
  "wait_audio": false
}
```

**Response:**
```json
{
  "ids": ["clip-id-1", "clip-id-2"],
  "message": "Music generation started"
}
```

**Rate Limit:** 10/min (Tier 2)

#### GET /api/audio/suno/status
Check Suno music generation status.

**Query Parameters:**
- `ids`: Comma-separated clip IDs

**Response:**
```json
{
  "clips": [
    {
      "id": "clip-id-1",
      "status": "complete",
      "audio_url": "https://...",
      "title": "Generated Song",
      "tags": "electronic, upbeat"
    }
  ]
}
```

**Rate Limit:** 30/min (Tier 3)

---

### Video Processing

#### POST /api/video/split-scenes
Detect scene changes in a video using AI.

**Request:**
```json
{
  "assetId": "uuid"
}
```

**Response:**
```json
{
  "scenes": [
    { "start": 0, "end": 5.2 },
    { "start": 5.2, "end": 10.8 }
  ]
}
```

**Rate Limit:** 10/min (Tier 2)

#### POST /api/video/split-audio
Extract audio track from a video.

**Request:**
```json
{
  "videoAssetId": "uuid",
  "projectId": "uuid"
}
```

**Response:** Created audio asset object

**Rate Limit:** 10/min (Tier 2)

#### POST /api/video/upscale
Upscale video quality using AI.

**Request:**
```json
{
  "assetId": "uuid",
  "scaleFactor": 2
}
```

**Response:**
```json
{
  "jobId": "uuid",
  "status": "queued",
  "message": "Upscaling started"
}
```

**Rate Limit:** 10/min (Tier 2)

#### GET /api/video/upscale-status
Check video upscaling status.

**Query Parameters:**
- `jobId`: UUID

**Response:**
```json
{
  "jobId": "uuid",
  "status": "processing",
  "progress": 45,
  "resultUrl": null
}
```

**Rate Limit:** 30/min (Tier 3)

---

### Export

#### POST /api/export
Export/render final video with all edits applied.

**Request:**
```json
{
  "projectId": "uuid",
  "timeline": {
    "clips": [
      {
        "id": "clip-uuid",
        "assetId": "asset-uuid",
        "start": 0,
        "end": 10,
        "timelinePosition": 0,
        "trackIndex": 0,
        "volume": 1,
        "opacity": 1,
        "speed": 1,
        "transitionToNext": {
          "type": "crossfade",
          "duration": 1
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

**Response:**
```json
{
  "jobId": "uuid",
  "status": "queued",
  "message": "Export job created",
  "estimatedTime": 25
}
```

**Rate Limit:** 10/min (Tier 2)

#### GET /api/export
Check export job status.

**Query Parameters:**
- `jobId`: UUID

**Response:**
```json
{
  "jobId": "uuid",
  "status": "processing",
  "message": "Export in progress (45%)",
  "estimatedTime": null
}
```

**Rate Limit:** 30/min (Tier 3)

---

### AI Chat

#### POST /api/ai/chat
Interact with AI assistant for editing suggestions.

**Request:**
```json
{
  "message": "Suggest transitions for my video",
  "projectId": "uuid",
  "conversationHistory": [
    { "role": "user", "content": "Previous message" },
    { "role": "assistant", "content": "Previous response" }
  ]
}
```

**Response:**
```json
{
  "response": "I recommend using crossfade transitions...",
  "model": "gemini-2.5-flash",
  "usage": {
    "promptTokens": 150,
    "completionTokens": 200,
    "totalTokens": 350
  }
}
```

**Rate Limit:** 10/min (Tier 2)

---

### Frame Editing

#### POST /api/frames/{frameId}/edit
Apply transformations to an image frame (keyframe animation).

**Path Parameters:**
- `frameId`: UUID

**Request:**
```json
{
  "transformations": {
    "scale": 1.5,
    "rotation": 45,
    "opacity": 0.8,
    "x": 100,
    "y": 50
  }
}
```

**Response:**
```json
{
  "success": true,
  "frameId": "uuid",
  "transformations": {
    "scale": 1.5,
    "rotation": 45,
    "opacity": 0.8,
    "x": 100,
    "y": 50
  }
}
```

**Rate Limit:** 60/min (Tier 1)

---

### Logging

#### POST /api/logs
Submit client-side logs to server.

**Request:**
```json
{
  "logs": [
    {
      "level": "error",
      "message": "Failed to load asset",
      "timestamp": "2025-10-23T12:00:00.000Z",
      "metadata": {
        "assetId": "uuid",
        "error": "Network timeout"
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "received": 1
}
```

**Rate Limit:** 60/min (Tier 1)

---

### History

#### GET /api/history
Get user activity history.

**Query Parameters:**
- `projectId`: UUID (optional, filter by project)
- `limit`: number (default 50)
- `offset`: number (default 0)

**Response:**
```json
{
  "activities": [
    {
      "id": "uuid",
      "activity_type": "video_generation",
      "title": "Video Generated",
      "model": "veo-002",
      "asset_id": "uuid",
      "created_at": "2025-10-23T12:00:00.000Z"
    }
  ],
  "total": 100,
  "hasMore": true
}
```

**Rate Limit:** 60/min (Tier 1)

---

### Admin (Requires Admin Role)

#### POST /api/admin/change-tier
Change a user's subscription tier.

**Request:**
```json
{
  "userId": "uuid",
  "newTier": "pro"
}
```

**Response:**
```json
{
  "success": true,
  "userId": "uuid",
  "newTier": "pro"
}
```

**Rate Limit:** 60/min (Tier 1)

#### POST /api/admin/delete-user
Delete a user account (admin only).

**Request:**
```json
{
  "userId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "userId": "uuid"
}
```

**Rate Limit:** 60/min (Tier 1)

---

### User Management

#### DELETE /api/user/delete-account
Delete the authenticated user's account.

**Request:** No body required

**Response:**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

**Rate Limit:** 10/min (Tier 2)

---

### Authentication

#### POST /api/auth/signout
Sign out the current user.

**Request:** No body required

**Response:**
```json
{
  "success": true,
  "message": "Signed out successfully"
}
```

**Rate Limit:** 60/min (Tier 1)

---

### Stripe Payments

#### POST /api/stripe/checkout
Create a Stripe checkout session.

**Request:**
```json
{
  "priceId": "price_xxx",
  "successUrl": "https://app.com/success",
  "cancelUrl": "https://app.com/cancel"
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/...",
  "sessionId": "cs_xxx"
}
```

**Rate Limit:** 10/min (Tier 2)

#### POST /api/stripe/portal
Create a Stripe customer portal session.

**Request:** No body required

**Response:**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

**Rate Limit:** 10/min (Tier 2)

#### POST /api/stripe/webhook
Stripe webhook handler (public endpoint, validates Stripe signature).

**Note:** This endpoint is called by Stripe, not by client applications.

---

## SDK Example Usage

### JavaScript/TypeScript

```typescript
// Generate a video
const response = await fetch('/api/video/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'A serene lake at sunset',
    projectId: 'project-uuid',
    model: 'veo-002',
    duration: 5,
    aspectRatio: '16:9'
  })
});

const { operationName } = await response.json();

// Poll for status
const pollStatus = async () => {
  const statusResponse = await fetch(
    `/api/video/status?operationName=${operationName}&projectId=${projectId}`
  );
  const status = await statusResponse.json();

  if (status.done) {
    console.log('Video ready!', status.asset);
  } else {
    console.log('Progress:', status.progress);
    setTimeout(pollStatus, 5000); // Poll every 5 seconds
  }
};

pollStatus();
```

## Best Practices

1. **Polling:** When polling for async operation status, use 5-10 second intervals
2. **Rate Limits:** Implement exponential backoff when rate limited
3. **Error Handling:** Always handle all possible HTTP status codes
4. **Timeouts:** Set appropriate timeouts for long-running operations
5. **File Uploads:** Validate file size and type before uploading
6. **Authentication:** Always include credentials in requests
7. **Progress Tracking:** Use the progress percentage for UI feedback

## Support

For API support, contact support@example.com
