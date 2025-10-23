# API Quick Reference

Quick reference guide for the most commonly used API endpoints.

## Authentication

All requests require session cookie: `supabase-auth-token`

```typescript
// Browser automatically includes cookies
fetch('/api/video/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({...})
});
```

## Common Endpoints

### Generate Video
```typescript
POST /api/video/generate
{
  "prompt": "A serene lake at sunset",
  "projectId": "uuid",
  "model": "veo-002",
  "duration": 5,
  "aspectRatio": "16:9"
}
// Rate Limit: 10/min
```

### Check Video Status
```typescript
GET /api/video/status?operationName=xxx&projectId=xxx
// Rate Limit: 30/min
// Poll every 5-10 seconds
```

### Generate Image
```typescript
POST /api/image/generate
{
  "prompt": "A cat wearing sunglasses",
  "projectId": "uuid",
  "sampleCount": 2
}
// Rate Limit: 10/min
```

### Generate Speech (TTS)
```typescript
POST /api/audio/elevenlabs/generate
{
  "text": "Hello world",
  "projectId": "uuid",
  "voiceId": "EXAVITQu4vr4xnSDxMaL"
}
// Rate Limit: 10/min
```

### Upload Asset
```typescript
POST /api/assets/upload
FormData {
  file: File,
  projectId: "uuid",
  type: "video"
}
// Rate Limit: 10/min
// Max Size: 100MB
```

### Create Project
```typescript
POST /api/projects
{
  "title": "My Project"
}
// Rate Limit: 10/min
```

### Export Video
```typescript
POST /api/export
{
  "projectId": "uuid",
  "timeline": { clips: [...] },
  "outputSpec": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "format": "mp4"
  }
}
// Rate Limit: 10/min
```

## Rate Limits

| Tier | Limit | Endpoints |
|------|-------|-----------|
| Tier 1 | 60/min | Read operations, lists |
| Tier 2 | 10/min | Video/image/audio gen, uploads |
| Tier 3 | 30/min | Status checks, polling |

## Response Headers

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1234567890
```

## Common Errors

### 400 Bad Request
```json
{
  "error": "Validation error",
  "message": "Invalid prompt length",
  "field": "prompt"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 429 Rate Limit
```json
{
  "error": "Rate limit exceeded",
  "limit": 10,
  "remaining": 0,
  "resetAt": 1234567890
}
```

## Polling Pattern

```typescript
async function pollStatus(operationName: string, projectId: string) {
  const maxAttempts = 120; // 10 minutes
  let attempts = 0;

  while (attempts < maxAttempts) {
    const res = await fetch(
      `/api/video/status?operationName=${operationName}&projectId=${projectId}`
    );
    const status = await res.json();

    if (status.done) {
      return status.asset;
    }

    if (status.error) {
      throw new Error(status.error);
    }

    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds
    attempts++;
  }

  throw new Error('Timeout waiting for video generation');
}
```

## Available Models

### Video
- `veo-002` - Google Veo 2 (high quality)
- `veo-003` - Google Veo 3 (fastest)
- `seedance-1.0-pro` - FAL.ai (image-to-video)
- `minimax-hailuo-02-pro` - MiniMax (fast)

### Image
- `imagen-3.0-generate-001` - Standard
- `imagen-3.0-fast` - Fast generation

### Audio
- ElevenLabs: 100+ voices
- Suno: AI music generation

## Aspect Ratios

- `16:9` - Widescreen (YouTube)
- `9:16` - Portrait (TikTok, Instagram Stories)
- `1:1` - Square (Instagram)
- `4:3` - Traditional
- `3:4` - Portrait traditional

## File Upload Limits

- **Max Size:** 100MB per file
- **Image:** JPEG, PNG, GIF, WebP, AVIF
- **Video:** MP4, WebM, QuickTime, AVI
- **Audio:** MP3, WAV, OGG, WebM

## TypeScript Types

```typescript
import type {
  GenerateVideoRequest,
  GenerateVideoResponse,
  GenerateImageRequest,
  Asset,
  APIError
} from '@/types/api';
```

## Interactive Docs

Visit `/api-docs` for interactive Swagger UI documentation with:
- Try it out functionality
- Schema explorer
- Example requests/responses

---

For full documentation, see:
- `/docs/API_DOCUMENTATION.md`
- `/types/api.ts`
- `/openapi.json`
