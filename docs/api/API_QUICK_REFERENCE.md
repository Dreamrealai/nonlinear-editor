# API Quick Reference Guide

Quick reference for the Non-Linear Video Editor API endpoints.

## Base URL

```
https://your-domain.com/api
```

## Authentication

All endpoints require session cookie: `supabase-auth-token`

## Rate Limits

| Tier | Limit/Min | Use Case                         |
| ---- | --------- | -------------------------------- |
| 1    | 5         | Auth, payments, account deletion |
| 2    | 10        | AI generation, uploads           |
| 3    | 30        | Status checks, reads             |
| 4    | 60        | General operations               |

---

## Endpoints Quick Reference

### Authentication

```http
POST /api/auth/signout
```

---

### Projects

```http
POST /api/projects
Body: { "title": "Project Name" }
```

---

### Assets

```http
# List assets
GET /api/assets?projectId={uuid}&type={image|video|audio}&page=0&pageSize=50

# Upload asset
POST /api/assets/upload
Content-Type: multipart/form-data
Body: file, projectId, type
```

---

### Video Generation

```http
# Generate video
POST /api/video/generate
Body: {
  "prompt": "description",
  "projectId": "uuid",
  "model": "veo-3.1-generate-preview",
  "aspectRatio": "16:9",
  "duration": 5
}

# Check status
GET /api/video/status?operationName={op-id}&projectId={uuid}
```

**Models:**

- `veo-3.1-generate-preview` - Veo with audio
- `veo-3.1-fast-generate-preview` - Fast Veo with audio
- `veo-2.0-generate-001` - Veo v2, no audio
- `seedance-1.0-pro` - FAL Seedance
- `minimax-hailuo-02-pro` - FAL MiniMax

---

### Image Generation

```http
POST /api/image/generate
Body: {
  "prompt": "description",
  "projectId": "uuid",
  "aspectRatio": "16:9",
  "sampleCount": 2
}
```

---

### Audio Generation

```http
# Text-to-speech (ElevenLabs)
POST /api/audio/elevenlabs/generate
Body: {
  "text": "text to speak",
  "projectId": "uuid",
  "voiceId": "EXAVITQu4vr4xnSDxMaL",
  "stability": 0.6
}

# Get voices
GET /api/audio/elevenlabs/voices

# Sound effects
POST /api/audio/elevenlabs/sfx
Body: {
  "prompt": "sound description",
  "projectId": "uuid",
  "duration": 5.0
}

# Music generation (Suno)
POST /api/audio/suno/generate
Body: {
  "prompt": "music description",
  "projectId": "uuid",
  "style": "pop, upbeat",
  "customMode": true
}

# Check music status
GET /api/audio/suno/status?taskId={task-id}
```

---

### AI Chat

```http
POST /api/ai/chat
Content-Type: multipart/form-data
Body: message, model, projectId, chatHistory, file-*
```

---

### Export

```http
# Start export
POST /api/export
Body: {
  "projectId": "uuid",
  "timeline": { "clips": [...] },
  "outputSpec": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "format": "mp4"
  }
}

# Check export status
GET /api/export?jobId={job-id}
```

---

### History

```http
# Get history
GET /api/history?limit=50&offset=0

# Add entry
POST /api/history
Body: {
  "project_id": "uuid",
  "activity_type": "video_generation",
  "title": "Activity title"
}

# Clear history
DELETE /api/history
```

---

### Admin (Admin role required)

```http
# Get cache stats
GET /api/admin/cache

# Clear caches
DELETE /api/admin/cache
```

---

### Stripe/Payments

```http
# Create checkout session
POST /api/stripe/checkout
Body: { "priceId": "price_xxx" }

# Billing portal
POST /api/stripe/portal

# Webhook
POST /api/stripe/webhook
Header: stripe-signature
```

---

### User Management

```http
# Delete account (IRREVERSIBLE!)
DELETE /api/user/delete-account
```

---

## Common Response Codes

| Code | Meaning                  |
| ---- | ------------------------ |
| 200  | Success                  |
| 202  | Accepted (async started) |
| 400  | Bad Request              |
| 401  | Unauthorized             |
| 403  | Forbidden                |
| 404  | Not Found                |
| 413  | Payload Too Large        |
| 429  | Rate Limit Exceeded      |
| 500  | Server Error             |
| 503  | Service Unavailable      |
| 504  | Gateway Timeout          |

---

## Common Patterns

### Generate Video Workflow

```javascript
// 1. Start generation
const { operationName } = await fetch('/api/video/generate', {
  method: 'POST',
  body: JSON.stringify({
    prompt: '...',
    projectId: '...',
    model: 'veo-3.1-generate-preview',
  }),
}).then((r) => r.json());

// 2. Poll status every 5-10 seconds
const poll = setInterval(async () => {
  const status = await fetch(
    `/api/video/status?operationName=${operationName}&projectId=${projectId}`
  ).then((r) => r.json());

  if (status.done) {
    clearInterval(poll);
    console.log('Video ready:', status.asset);
  }
}, 5000);
```

### Upload Asset Workflow

```javascript
const formData = new FormData();
formData.append('file', fileBlob);
formData.append('projectId', projectId);
formData.append('type', 'video');

const { assetId, publicUrl } = await fetch('/api/assets/upload', {
  method: 'POST',
  body: formData,
}).then((r) => r.json());
```

### Handle Rate Limits

```javascript
async function apiCall(url, options) {
  const response = await fetch(url, options);

  if (response.status === 429) {
    const { resetAt } = await response.json();
    const waitTime = resetAt - Date.now();
    await new Promise((resolve) => setTimeout(resolve, waitTime));
    return apiCall(url, options); // Retry
  }

  return response;
}
```

---

## File Size Limits

- Asset Upload: 100MB max
- Chat File Attachments: 10MB max per file, 5 files max
- Chat History: 100KB max
- Message Length: 5000 chars max

---

## Validation Constraints

### Strings

- Prompt: 3-1000 chars
- Title: 1-200 chars
- Negative Prompt: 0-1000 chars
- Voice ID: 1-100 alphanumeric chars

### Numbers

- Seed: 0-2147483647
- Sample Count: 1-8 (images), 1-4 (videos)
- Stability/Similarity: 0-1
- Duration: 0.5-22 seconds (varies by service)

### Aspect Ratios

- `1:1`, `16:9`, `9:16`, `4:3`, `3:4`

---

## Environment Variables Required

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

# Suno
COMET_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PREMIUM_PRICE_ID=

# Features
VIDEO_EXPORT_ENABLED=true
```

---

## Error Response Format

```json
{
  "error": "Error message",
  "field": "fieldName"
}
```

## Rate Limit Headers

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1698123456789
```

---

## Best Practices

1. **Implement exponential backoff** for rate limits
2. **Poll status endpoints** at 5-10 second intervals
3. **Validate UUIDs** before sending
4. **Handle timeouts** - AI operations can take 60+ seconds
5. **Respect file size limits** - 100MB for uploads
6. **Use HTTPS** in production
7. **Store operation IDs** for status polling
8. **Implement proper error handling** for all error codes

---

**For full documentation, see:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

**For OpenAPI spec, see:** [openapi.yaml](./openapi.yaml)
