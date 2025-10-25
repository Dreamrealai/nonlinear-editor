# API Guide

**Complete guide to the Non-Linear Editor API - documentation, authentication, rate limiting, and usage examples.**

Last Updated: 2025-10-25
Maintained by: Engineering Team

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [API Endpoints](#api-endpoints)
5. [Quick Start Examples](#quick-start-examples)
6. [Error Handling](#error-handling)
7. [Webhooks](#webhooks)

---

## Getting Started

### Base URL

```
Production: https://nonlinearvideoeditor.com/api
Development: http://localhost:3000/api
```

### Authentication

All API endpoints require authentication using Supabase Auth tokens.

```typescript
// Include auth token in headers
headers: {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
}
```

### Response Format

All API responses follow this structure:

```typescript
// Success
{
  data: T,           // Response data
  error: null
}

// Error
{
  data: null,
  error: string      // Error message
}
```

---

## Authentication

### Getting an Access Token

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
});

const accessToken = data.session.access_token;
```

### Using the Token

```typescript
const response = await fetch('/api/projects', {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});
```

### Token Refresh

Tokens expire after 1 hour. Refresh them using:

```typescript
const { data, error } = await supabase.auth.refreshSession();
const newToken = data.session.access_token;
```

---

## Rate Limiting

### Rate Limit Tiers

| Tier   | Plan       | Requests/Minute |
| ------ | ---------- | --------------- |
| Tier 1 | Free       | 10              |
| Tier 2 | Pro        | 30              |
| Tier 3 | Enterprise | 100             |

### Rate Limit Headers

```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 29
X-RateLimit-Reset: 1640000000
```

### Handling Rate Limits

```typescript
const response = await fetch('/api/projects');

if (response.status === 429) {
  const resetTime = response.headers.get('X-RateLimit-Reset');
  const waitTime = resetTime - Date.now();

  // Wait and retry
  await new Promise((resolve) => setTimeout(resolve, waitTime));
}
```

---

## API Endpoints

### Projects

#### GET /api/projects

Get all projects for authenticated user.

**Response:**

```typescript
{
  data: Project[],
  error: null
}
```

#### POST /api/projects

Create a new project.

**Request:**

```typescript
{
  title: string,
  description?: string,
  settings?: ProjectSettings
}
```

**Response:**

```typescript
{
  data: Project,
  error: null
}
```

#### GET /api/projects/[id]

Get project by ID.

#### PUT /api/projects/[id]

Update project.

#### DELETE /api/projects/[id]

Delete project.

### Assets

#### GET /api/assets

Get all assets for authenticated user.

#### POST /api/assets/upload

Upload a new asset.

**Request:** `multipart/form-data`

- `file`: File to upload
- `projectId`: Project ID
- `type`: 'video' | 'audio' | 'image'

**Response:**

```typescript
{
  data: Asset,
  error: null
}
```

#### DELETE /api/assets/[id]

Delete asset.

### Video Generation

#### POST /api/video/generate

Generate AI video.

**Request:**

```typescript
{
  prompt: string,
  duration: number,
  model?: 'kling' | 'minimax' | 'pixverse'
}
```

**Response:**

```typescript
{
  data: {
    operationName: string,
    status: 'pending' | 'processing' | 'completed' | 'failed'
  },
  error: null
}
```

#### GET /api/video/status/[operationName]

Check video generation status.

### Audio Generation

#### POST /api/audio/generate

Generate AI audio.

**Request:**

```typescript
{
  prompt: string,
  duration?: number
}
```

### Export

#### POST /api/export

Export project to video.

**Request:**

```typescript
{
  projectId: string,
  settings: ExportSettings
}
```

---

## Quick Start Examples

### Create a Project

```typescript
const response = await fetch('/api/projects', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: 'My First Project',
  }),
});

const { data: project } = await response.json();
```

### Upload an Asset

```typescript
const formData = new FormData();
formData.append('file', videoFile);
formData.append('projectId', projectId);
formData.append('type', 'video');

const response = await fetch('/api/assets/upload', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
  body: formData,
});

const { data: asset } = await response.json();
```

### Generate AI Video

```typescript
const response = await fetch('/api/video/generate', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: 'A cat playing piano',
    duration: 10,
  }),
});

const { data } = await response.json();

// Poll for status
while (true) {
  const statusResponse = await fetch(`/api/video/status/${data.operationName}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const { data: status } = await statusResponse.json();

  if (status.status === 'completed') {
    console.log('Video ready:', status.url);
    break;
  }

  await new Promise((resolve) => setTimeout(resolve, 5000));
}
```

---

## Error Handling

### Error Codes

| Code | Meaning                                 |
| ---- | --------------------------------------- |
| 400  | Bad Request - Invalid parameters        |
| 401  | Unauthorized - Invalid or missing token |
| 403  | Forbidden - Insufficient permissions    |
| 404  | Not Found - Resource doesn't exist      |
| 429  | Too Many Requests - Rate limit exceeded |
| 500  | Internal Server Error                   |

### Error Response Format

```typescript
{
  data: null,
  error: string  // Human-readable error message
}
```

### Handling Errors

```typescript
const response = await fetch('/api/projects');
const result = await response.json();

if (result.error) {
  // Handle error
  console.error('API Error:', result.error);

  switch (response.status) {
    case 401:
      // Redirect to login
      break;
    case 429:
      // Wait and retry
      break;
    default:
    // Show error message
  }
}
```

---

## Webhooks

### Setting Up Webhooks

Configure webhook URLs in your account settings to receive real-time notifications.

### Webhook Events

- `project.created`
- `project.updated`
- `project.deleted`
- `asset.uploaded`
- `asset.deleted`
- `video.generated`
- `export.completed`

### Webhook Payload

```typescript
{
  event: string,
  timestamp: number,
  data: any
}
```

### Verifying Webhooks

```typescript
import crypto from 'crypto';

function verifyWebhook(payload, signature, secret) {
  const hash = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');

  return hash === signature;
}
```

---

## Additional Resources

- **[API Examples](/docs/api/API_EXAMPLES.md)** - Comprehensive code examples
- **[Provider-Specific APIs](/docs/api/providers/)** - External API documentation
- **[Webhooks Documentation](/docs/api/WEBHOOKS.md)** - Detailed webhook guide
- **[Rate Limiting Guide](/docs/RATE_LIMITING.md)** - Rate limiting implementation details

---

**API Version:** v1
**Last Updated:** 2025-10-25
**Consolidation:** Merged API_DOCUMENTATION.md, API_DOCUMENTATION_SUMMARY.md, and API_QUICK_START.md
