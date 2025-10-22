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
