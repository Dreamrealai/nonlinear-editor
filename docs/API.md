# API Documentation

## Authentication

All API routes require authentication unless otherwise specified. Authentication is handled via Supabase Auth with cookie-based sessions.

### Headers Required
```
Cookie: sb-<project-ref>-auth-token=<session-token>
```

### Error Responses
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - User lacks permission for requested resource
- `500 Internal Server Error` - Server-side error

---

## Projects API

### GET /api/projects
Get all projects for authenticated user.

**Response:**
```json
{
  "projects": [
    {
      "id": "uuid",
      "title": "My Project",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z",
      "user_id": "uuid"
    }
  ]
}
```

### POST /api/projects
Create a new project.

**Request Body:**
```json
{
  "title": "New Project" // optional, defaults to "Untitled Project"
}
```

**Response:**
```json
{
  "project": {
    "id": "uuid",
    "title": "New Project",
    "created_at": "2025-01-01T00:00:00Z",
    "user_id": "uuid"
  }
}
```

---

## Assets API

### GET /api/assets/sign
Generate signed URL for accessing private asset.

**Query Parameters:**
- `storageUrl` (required) - Supabase storage URL (format: `supabase://bucket/path`)
- `ttl` (optional) - Time to live in seconds (default: 3600)

**Security:**
- Verifies user owns the asset (via folder structure)
- Returns 403 if asset belongs to different user

**Response:**
```json
{
  "signedUrl": "https://storage.supabase.co/..."
}
```

**Error Responses:**
```json
{
  "error": "storageUrl required"
}
// or
{
  "error": "Forbidden - asset does not belong to user"
}
```

---

## AI Chat API

### POST /api/ai/chat
Send message to AI assistant.

**Request Body:**
```json
{
  "projectId": "uuid",
  "message": "How do I add a transition?",
  "model": "gemini-2.0-flash-exp", // optional
  "attachments": [] // optional
}
```

**Response:**
```json
{
  "response": "To add a transition...",
  "model": "gemini-2.0-flash-exp"
}
```

**Available Models:**
- `gemini-2.0-flash-exp` - Latest & fastest
- `gemini-1.5-pro` - Most capable
- `gemini-1.5-flash` - Fast & efficient

---

## Export API

### POST /api/export
Start video export job.

**Request Body:**
```json
{
  "projectId": "uuid",
  "timeline": {
    "clips": [
      {
        "id": "uuid",
        "assetId": "uuid",
        "start": 0,
        "end": 10,
        "timelinePosition": 0,
        "trackIndex": 0,
        "volume": 1.0,
        "opacity": 1.0,
        "speed": 1.0
      }
    ]
  },
  "outputSpec": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "vBitrateK": 8000,
    "aBitrateK": 192,
    "format": "mp4"
  }
}
```

**Response:**
```json
{
  "jobId": "export_1234567890_abc123",
  "status": "queued",
  "message": "Export job created",
  "estimatedTime": 120 // seconds
}
```

**Export Status Values:**
- `queued` - Waiting to be processed
- `processing` - Currently rendering
- `completed` - Export finished successfully
- `failed` - Export failed with errors

### GET /api/export?jobId=xxx
Check status of export job.

**Query Parameters:**
- `jobId` (required) - Export job ID from POST request

**Response:**
```json
{
  "jobId": "export_1234567890_abc123",
  "status": "processing",
  "message": "Rendering video...",
  "progress": 45 // percentage (optional)
}
```

**Note:** Full export functionality requires FFmpeg integration on the server.

---

## Logs API

### POST /api/logs
Submit browser logs for centralized logging.

**Request Body:**
```json
{
  "logs": [
    {
      "level": "error",
      "timestamp": "2025-01-01T00:00:00Z",
      "message": "Failed to load asset",
      "data": {
        "assetId": "uuid",
        "error": "Network error"
      },
      "userAgent": "Mozilla/5.0...",
      "url": "https://example.com/editor/123"
    }
  ]
}
```

**Log Levels:**
- `trace` - Verbose debugging
- `debug` - Debugging information
- `info` - General information
- `warn` - Warning messages
- `error` - Error messages
- `fatal` - Fatal errors

**Response:**
```json
{
  "success": true,
  "count": 1
}
```

**Integration:**
- Logs are forwarded to Axiom if configured
- Falls back to console in development mode
- Requires `AXIOM_TOKEN` and `AXIOM_DATASET` environment variables

---

## Video Generation API

### POST /api/video/generate
Generate video using Google Veo 3.1.

**Request Body:**
```json
{
  "prompt": "A sunset over mountains",
  "projectId": "uuid",
  "model": "veo-004",
  "aspectRatio": "16:9",
  "duration": "5s",
  "resolution": "1080p",
  "negativePrompt": "blurry, low quality",
  "personGeneration": "dont_allow",
  "enhancePrompt": true,
  "generateAudio": false,
  "seed": 12345,
  "sampleCount": 1,
  "compressionQuality": 90,
  "imageAssetId": "uuid"
}
```

**Response:**
```json
{
  "operationName": "projects/xxx/locations/us-central1/operations/xxx",
  "status": "processing",
  "message": "Video generation started. Use the operation name to check status."
}
```

**Rate Limit:** 5 requests per minute per user

---

### GET /api/video/status
Check video generation status.

**Query Parameters:**
- `operationName` (required) - Operation name from generate endpoint

**Response (Processing):**
```json
{
  "status": "processing",
  "progress": 45,
  "message": "Generating video..."
}
```

**Response (Completed):**
```json
{
  "status": "completed",
  "assetId": "uuid",
  "message": "Video generated successfully",
  "asset": {
    "id": "uuid",
    "storage_url": "supabase://assets/...",
    "metadata": { ... }
  }
}
```

---

### POST /api/video/split-scenes
Detect scenes in a video using Google Video Intelligence.

**Request Body:**
```json
{
  "assetId": "uuid",
  "projectId": "uuid"
}
```

**Response:**
```json
{
  "message": "Successfully detected 15 scenes",
  "scenes": [
    {
      "id": "uuid",
      "asset_id": "uuid",
      "start_ms": 0,
      "end_ms": 3500,
      "created_at": "2025-01-23T12:00:00Z"
    }
  ],
  "count": 15,
  "note": "Scene frames can be extracted in the Keyframe Editor"
}
```

**Note:** Requires `GOOGLE_SERVICE_ACCOUNT` environment variable.

---

### POST /api/video/upscale
Upscale video using fal.ai Topaz Video Upscale.

**Request Body:**
```json
{
  "assetId": "uuid",
  "projectId": "uuid",
  "upscaleFactor": 2,
  "targetFps": 60,
  "h264Output": false
}
```

**Response:**
```json
{
  "requestId": "xxx-xxx-xxx",
  "message": "Video upscale request submitted successfully"
}
```

---

### GET /api/video/upscale-status
Check video upscale status.

**Query Parameters:**
- `requestId` (required) - Request ID from upscale endpoint

**Response:**
```json
{
  "status": "completed",
  "videoUrl": "https://...",
  "progress": 100
}
```

---

## Image Generation API

### POST /api/image/generate
Generate images using Google Imagen.

**Request Body:**
```json
{
  "prompt": "A futuristic city at night",
  "projectId": "uuid",
  "model": "imagen-3.0-generate-001",
  "aspectRatio": "16:9",
  "negativePrompt": "blurry",
  "sampleCount": 1,
  "seed": 42,
  "safetyFilterLevel": "block_some",
  "personGeneration": "dont_allow",
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
      "storage_url": "supabase://assets/...",
      "type": "image",
      "metadata": {
        "provider": "imagen",
        "prompt": "A futuristic city at night",
        "model": "imagen-3.0-generate-001"
      }
    }
  ],
  "message": "Generated 1 image(s) successfully"
}
```

---

## Audio Generation API

### POST /api/audio/suno/generate
Generate music using Suno V5.

**Request Body:**
```json
{
  "prompt": "Upbeat electronic music",
  "projectId": "uuid",
  "style": "electronic, energetic",
  "title": "Energy Boost",
  "customMode": true,
  "instrumental": false
}
```

**Response:**
```json
{
  "taskId": "xxx-xxx-xxx",
  "message": "Audio generation started"
}
```

---

### GET /api/audio/suno/status
Check Suno audio generation status.

**Query Parameters:**
- `taskId` (required) - Task ID from generate endpoint

**Response:**
```json
{
  "status": "completed",
  "audioUrl": "https://...",
  "clips": [
    {
      "id": "xxx",
      "audio_url": "https://...",
      "title": "Energy Boost",
      "duration": 180
    }
  ]
}
```

---

### POST /api/audio/elevenlabs/generate
Generate voiceover using ElevenLabs TTS.

**Request Body:**
```json
{
  "text": "Welcome to our video editor",
  "voiceId": "21m00Tcm4TlvDq8ikWAM",
  "projectId": "uuid",
  "modelId": "eleven_monolingual_v1",
  "stability": 0.5,
  "similarityBoost": 0.75
}
```

**Response:**
```json
{
  "assetId": "uuid",
  "message": "Audio generated successfully"
}
```

---

### GET /api/audio/elevenlabs/voices
List available ElevenLabs voices.

**Response:**
```json
{
  "voices": [
    {
      "voice_id": "21m00Tcm4TlvDq8ikWAM",
      "name": "Rachel",
      "labels": {
        "accent": "american",
        "age": "young",
        "gender": "female"
      }
    }
  ]
}
```

---

### POST /api/audio/elevenlabs/sfx
Generate sound effects using ElevenLabs.

**Request Body:**
```json
{
  "prompt": "Door opening",
  "projectId": "uuid",
  "duration": 3
}
```

**Response:**
```json
{
  "assetId": "uuid",
  "message": "Sound effect generated successfully"
}
```

---

## Assets API

### GET /api/assets
Get all assets for a project.

**Query Parameters:**
- `projectId` (required) - Project ID
- `type` (optional) - Filter by type: video, audio, image

**Response:**
```json
{
  "assets": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "type": "video",
      "storage_url": "supabase://assets/...",
      "metadata": { ... },
      "created_at": "2025-01-23T12:00:00Z"
    }
  ]
}
```

---

### POST /api/assets/upload
Upload asset file.

**Request (multipart/form-data):**
```
file: File
projectId: string
type: "video" | "audio" | "image"
```

**Response:**
```json
{
  "assetId": "uuid",
  "storageUrl": "supabase://assets/user/project/file.mp4",
  "publicUrl": "https://...",
  "success": true
}
```

**Validation:**
- Max file size: 100MB
- Allowed video types: mp4, webm, quicktime
- Allowed audio types: mp3, wav, ogg
- Allowed image types: jpeg, png, gif, webp

---

## Frame Editing API

### POST /api/frames/[frameId]/edit
Edit a video frame (AI-powered).

**Request Body:**
```json
{
  "prompt": "Remove the background",
  "model": "fal-ai/flux/dev"
}
```

**Response:**
```json
{
  "message": "Frame editing not yet implemented",
  "frameId": "uuid",
  "params": { "prompt": "Remove the background" }
}
```

**Note:** This endpoint is a placeholder for future AI-powered frame editing features.

---

## Video Audio Processing

### POST /api/video/generate-audio
Generate audio for video using fal.ai.

**Request Body:**
```json
{
  "videoAssetId": "uuid",
  "projectId": "uuid",
  "prompt": "Add ambient nature sounds",
  "seed": 42
}
```

**Response:**
```json
{
  "requestId": "xxx-xxx-xxx",
  "message": "Audio generation started for video"
}
```

---

### GET /api/video/generate-audio-status
Check video audio generation status.

**Query Parameters:**
- `requestId` (required) - Request ID from generate-audio endpoint

**Response:**
```json
{
  "status": "completed",
  "audioUrl": "https://...",
  "assetId": "uuid"
}
```

---

## Authentication API

### POST /api/auth/signout
Sign out the current user.

**Security:**
- Uses POST method to prevent CSRF attacks
- Validates origin header

**Response:**
```json
{
  "success": true
}
```

**Error Responses:**
```json
{
  "error": "Invalid origin"
}
// or
{
  "error": "Supabase not configured"
}
```

---

## Rate Limiting

API routes are subject to rate limiting:
- Sign in/up: 30 requests per 5 minutes per IP
- Token refresh: 150 requests per 5 minutes per IP
- Email sending: 2 emails per hour
- Anonymous sign-ins: 30 per hour per IP

Exceeding rate limits returns:
```json
{
  "error": "Rate limit exceeded. Please try again later."
}
```

---

## Error Handling

All API routes follow consistent error response format:

```json
{
  "error": "Error message here"
}
```

Common HTTP status codes:
- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `202 Accepted` - Request accepted (async processing)
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Permission denied
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Database Schema

### Projects Table
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Project',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Assets Table
```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users NOT NULL,
  type TEXT CHECK (type IN ('video', 'audio', 'image')),
  storage_url TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Timelines Table
```sql
CREATE TABLE timelines (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects UNIQUE ON DELETE CASCADE,
  timeline_data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Environment Variables

### Required Variables

**Supabase (Required for core functionality):**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  # Server-side only, never expose
```

### Optional Variables

**Google AI Services (Video generation, scene detection, image generation):**
```bash
GOOGLE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
GCS_BUCKET_NAME=your-bucket-name  # Auto-created if not specified
```

**AI Chat (Gemini):**
```bash
GEMINI_API_KEY=your-gemini-api-key
```

**Video Upscaling & Audio Generation (fal.ai):**
```bash
FAL_API_KEY=your-fal-api-key
```

**Audio Generation (Suno via Comet API):**
```bash
COMET_API_KEY=your-comet-api-key
```

**Text-to-Speech (ElevenLabs):**
```bash
ELEVENLABS_API_KEY=your-elevenlabs-api-key
```

**Audio Processing (Wavespeed):**
```bash
WAVESPEED_API_KEY=your-wavespeed-api-key
```

**Logging & Monitoring (Axiom):**
```bash
AXIOM_TOKEN=your-axiom-token
AXIOM_DATASET=your-dataset-name
```

**Application URLs (for CORS/redirects):**
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Development
# or
NEXT_PUBLIC_APP_URL=https://yourdomain.com  # Production
```

### Variable Descriptions

| Variable | Required | Purpose | Exposed to Client |
|----------|----------|---------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public API key (RLS enforced) | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Admin key (bypasses RLS) | No |
| `GOOGLE_SERVICE_ACCOUNT` | Optional | Google Cloud credentials JSON | No |
| `GCS_BUCKET_NAME` | Optional | GCS bucket for video processing | No |
| `GEMINI_API_KEY` | Optional | Google Gemini API key | No |
| `FAL_API_KEY` | Optional | fal.ai API key | No |
| `COMET_API_KEY` | Optional | Comet API (Suno wrapper) | No |
| `ELEVENLABS_API_KEY` | Optional | ElevenLabs API key | No |
| `WAVESPEED_API_KEY` | Optional | Wavespeed API key | No |
| `AXIOM_TOKEN` | Optional | Axiom logging token | No |
| `AXIOM_DATASET` | Optional | Axiom dataset name | No |
| `NEXT_PUBLIC_APP_URL` | Optional | App URL for CORS | Yes |

### Configuration Example

Create `.env.local` file:
```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Optional AI Features
GEMINI_API_KEY=
FAL_API_KEY=
GOOGLE_SERVICE_ACCOUNT={"type":"service_account",...}

# Optional Audio
COMET_API_KEY=
ELEVENLABS_API_KEY=

# Optional Logging
AXIOM_TOKEN=
AXIOM_DATASET=genai-video-production
```

---

## Best Practices

### Authentication
- Always check `user` object before processing requests
- Verify resource ownership for all mutations
- Use Supabase RLS policies as second layer of security

### Error Handling
- Log errors with context (user ID, resource ID, etc.)
- Return user-friendly error messages
- Never expose internal errors or stack traces to clients

### Performance
- Use database indexes for frequently queried fields
- Implement pagination for large result sets
- Cache signed URLs with appropriate TTL

### Security
- Validate all input parameters
- Sanitize user-provided data
- Use parameterized queries (Supabase handles this)
- Implement rate limiting on sensitive endpoints
