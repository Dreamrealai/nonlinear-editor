# API Quick Start Guide

> **Get started with the Non-Linear Video Editor API**
>
> Version: 1.0.0
> Last Updated: 2025-10-24

This guide will help you get started with the API in under 10 minutes.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Authentication](#authentication)
- [Common Workflows](#common-workflows)
  - [1. Generate Your First Video](#1-generate-your-first-video)
  - [2. Upload and Use Assets](#2-upload-and-use-assets)
  - [3. Create a Multi-Clip Project](#3-create-a-multi-clip-project)
  - [4. Generate Images](#4-generate-images)
  - [5. Generate Audio](#5-generate-audio)
- [Working with the Timeline](#working-with-the-timeline)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Next Steps](#next-steps)

---

## Prerequisites

Before you start:

1. **API Base URL**: `https://your-domain.com/api` (or `http://localhost:3000/api` for development)
2. **Authentication**: Session-based (Supabase Auth)
3. **Required Headers**:
   - `Content-Type: application/json` (for JSON requests)
   - Session cookie: `supabase-auth-token`

---

## Authentication

The API uses session-based authentication. After logging in through the web interface, your session cookie is automatically included in requests.

```typescript
// For browser-based applications, credentials are included automatically
const response = await fetch('/api/projects', {
  method: 'POST',
  credentials: 'include', // Include session cookie
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: 'My Project',
  }),
});
```

**Checking Authentication Status:**

```typescript
const checkAuth = async () => {
  const response = await fetch('/api/projects', {
    credentials: 'include',
  });

  if (response.status === 401) {
    // User not authenticated
    window.location.href = '/login';
  }
};
```

---

## Common Workflows

### 1. Generate Your First Video

Create a video from a text prompt using AI.

```typescript
// Step 1: Create a project
const createProject = async () => {
  const response = await fetch('/api/projects', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'My First Video',
    }),
  });

  return await response.json();
};

// Step 2: Generate video
const generateVideo = async (projectId: string) => {
  const response = await fetch('/api/video/generate', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'A serene lake at sunset with mountains in the background',
      projectId: projectId,
      model: 'veo-3.1-generate-preview',
      duration: 5,
      aspectRatio: '16:9',
      resolution: '1080p',
      generateAudio: true,
    }),
  });

  return await response.json();
};

// Step 3: Poll for completion
const waitForVideo = async (operationName: string, projectId: string) => {
  let delay = 5000;

  while (true) {
    const response = await fetch(
      `/api/video/status?operationName=${encodeURIComponent(operationName)}&projectId=${projectId}`,
      { credentials: 'include' }
    );

    const status = await response.json();

    if (status.done) {
      if (status.error) throw new Error(status.error);
      return status.asset;
    }

    console.log(`Progress: ${status.progress}%`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay = Math.min(delay * 1.2, 30000);
  }
};

// Complete workflow
const generateMyFirstVideo = async () => {
  try {
    // Create project
    const project = await createProject();
    console.log('Project created:', project.id);

    // Generate video
    const { operationName } = await generateVideo(project.id);
    console.log('Video generation started');

    // Wait for completion
    const asset = await waitForVideo(operationName, project.id);
    console.log('Video ready!', asset);

    return { project, asset };
  } catch (error) {
    console.error('Error:', error.message);
  }
};

// Run it
generateMyFirstVideo();
```

**Expected Output:**

```
Project created: 123e4567-e89b-12d3-a456-426614174000
Video generation started
Progress: 15%
Progress: 35%
Progress: 60%
Progress: 85%
Video ready! { id: 'asset-uuid', ... }
```

---

### 2. Upload and Use Assets

Upload your own media files to use in projects.

```typescript
// Upload a video file
const uploadVideo = async (file: File, projectId: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('projectId', projectId);
  formData.append('type', 'video');

  const response = await fetch('/api/assets/upload', {
    method: 'POST',
    credentials: 'include',
    body: formData, // Don't set Content-Type - browser handles it
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }

  return await response.json();
};

// Usage with file input
document.getElementById('fileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Validate file size (max 100MB)
  if (file.size > 100 * 1024 * 1024) {
    alert('File too large. Maximum size is 100MB.');
    return;
  }

  try {
    const result = await uploadVideo(file, 'your-project-id');
    console.log('Upload complete!', result.assetId);
  } catch (error) {
    alert(`Upload failed: ${error.message}`);
  }
});
```

**List Assets in a Project:**

```typescript
const listAssets = async (projectId: string) => {
  const response = await fetch(`/api/assets?projectId=${projectId}&type=video&page=0&pageSize=20`, {
    credentials: 'include',
  });

  const data = await response.json();

  console.log(`Found ${data.pagination.totalCount} assets`);
  return data.assets;
};
```

---

### 3. Create a Multi-Clip Project

Create a project with multiple clips and transitions.

```typescript
const createMultiClipProject = async () => {
  // 1. Create project
  const project = await fetch('/api/projects', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Multi-Clip Project' }),
  }).then((r) => r.json());

  // 2. Generate/upload multiple assets
  const asset1 = await generateVideo(project.id, 'A mountain sunrise');
  const asset2 = await generateVideo(project.id, 'Ocean waves');
  const asset3 = await generateVideo(project.id, 'Forest path');

  // 3. Build timeline with clips
  const timeline = {
    clips: [
      {
        id: 'clip-1',
        assetId: asset1.id,
        start: 0,
        end: 5000,
        timelinePosition: 0,
        trackIndex: 0,
        transitionToNext: {
          type: 'crossfade',
          duration: 500,
        },
      },
      {
        id: 'clip-2',
        assetId: asset2.id,
        start: 0,
        end: 5000,
        timelinePosition: 4500,
        trackIndex: 0,
        transitionToNext: {
          type: 'crossfade',
          duration: 500,
        },
      },
      {
        id: 'clip-3',
        assetId: asset3.id,
        start: 0,
        end: 5000,
        timelinePosition: 9000,
        trackIndex: 0,
      },
    ],
  };

  // 4. Export the video
  const exportResponse = await fetch('/api/export', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: project.id,
      timeline,
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

  return { project, timeline, exportJobId: exportResponse.jobId };
};
```

---

### 4. Generate Images

Create AI-generated images using Google Imagen.

```typescript
const generateImages = async (projectId: string) => {
  const response = await fetch('/api/image/generate', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'A futuristic city skyline at night with neon lights',
      projectId: projectId,
      aspectRatio: '16:9',
      sampleCount: 4, // Generate 4 variations
      safetyFilterLevel: 'block_some',
    }),
  });

  const data = await response.json();

  console.log(`Generated ${data.assets.length} images`);
  return data.assets;
};

// Usage
const images = await generateImages('project-id');
images.forEach((image, i) => {
  console.log(`Image ${i + 1}:`, image.metadata.sourceUrl);
});
```

---

### 5. Generate Audio

Create voiceovers, music, or sound effects.

**Text-to-Speech (ElevenLabs):**

```typescript
const generateVoiceover = async (projectId: string, text: string) => {
  const response = await fetch('/api/audio/elevenlabs/generate', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: text,
      projectId: projectId,
      voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah voice
      stability: 0.7,
      similarity: 0.8,
    }),
  });

  const data = await response.json();
  return data.asset;
};

// Usage
const voiceover = await generateVoiceover(
  'project-id',
  'Welcome to our video presentation about nature.'
);
```

**Music Generation (Suno):**

```typescript
const generateMusic = async (projectId: string) => {
  // Start generation
  const response = await fetch('/api/audio/suno/generate', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'Upbeat electronic dance music with energetic synths',
      projectId: projectId,
      customMode: false,
    }),
  });

  const { taskId } = await response.json();

  // Poll for completion
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const statusResponse = await fetch(
      `/api/audio/suno/status?taskId=${taskId}&projectId=${projectId}`,
      { credentials: 'include' }
    );

    const status = await statusResponse.json();

    if (status.tasks?.[0]?.status === 'completed') {
      return status.tasks[0];
    }
  }
};
```

**Sound Effects (ElevenLabs):**

```typescript
const generateSoundEffect = async (projectId: string) => {
  const response = await fetch('/api/audio/elevenlabs/sfx', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: projectId,
      prompt: 'Ocean waves crashing on a beach',
      duration: 5.0,
    }),
  });

  const data = await response.json();
  return data.asset;
};
```

---

## Working with the Timeline

### Timeline Structure

A timeline consists of clips positioned on tracks:

```typescript
interface Timeline {
  clips: Clip[];
}

interface Clip {
  id: string; // Unique clip ID
  assetId: string; // Asset this clip uses
  start: number; // Start time in asset (ms)
  end: number; // End time in asset (ms)
  timelinePosition: number; // Position on timeline (ms)
  trackIndex: number; // Track index (0 = bottom)
  volume?: number; // 0-2 (default: 1.0)
  opacity?: number; // 0-1 (default: 1.0)
  speed?: number; // 1-10 (default: 1.0)
  transitionToNext?: {
    type: 'crossfade' | 'fade-in' | 'fade-out';
    duration: number; // Transition duration (ms)
  };
}
```

### Example Timeline Configurations

**Simple Sequential Clips:**

```typescript
const timeline = {
  clips: [
    {
      id: 'clip-1',
      assetId: 'asset-1',
      start: 0,
      end: 5000,
      timelinePosition: 0,
      trackIndex: 0,
    },
    {
      id: 'clip-2',
      assetId: 'asset-2',
      start: 0,
      end: 3000,
      timelinePosition: 5000, // Starts after clip-1
      trackIndex: 0,
    },
  ],
};
```

**Clips with Crossfade Transition:**

```typescript
const timeline = {
  clips: [
    {
      id: 'clip-1',
      assetId: 'asset-1',
      start: 0,
      end: 5000,
      timelinePosition: 0,
      trackIndex: 0,
      transitionToNext: {
        type: 'crossfade',
        duration: 1000, // 1 second crossfade
      },
    },
    {
      id: 'clip-2',
      assetId: 'asset-2',
      start: 0,
      end: 5000,
      timelinePosition: 4000, // Overlaps by 1 second
      trackIndex: 0,
    },
  ],
};
```

**Multi-Track Timeline (Picture-in-Picture):**

```typescript
const timeline = {
  clips: [
    // Background video (track 0)
    {
      id: 'background',
      assetId: 'bg-asset',
      start: 0,
      end: 10000,
      timelinePosition: 0,
      trackIndex: 0,
      volume: 0.7,
    },
    // Overlay video (track 1)
    {
      id: 'overlay',
      assetId: 'overlay-asset',
      start: 0,
      end: 5000,
      timelinePosition: 2500,
      trackIndex: 1,
      opacity: 0.8,
      volume: 0,
    },
  ],
};
```

**Clip with Speed Adjustment:**

```typescript
const timeline = {
  clips: [
    {
      id: 'slow-motion',
      assetId: 'action-scene',
      start: 0,
      end: 4000,
      timelinePosition: 0,
      trackIndex: 0,
      speed: 0.5, // Play at half speed (slow motion)
    },
    {
      id: 'fast-forward',
      assetId: 'timelapse',
      start: 0,
      end: 10000,
      timelinePosition: 8000,
      trackIndex: 0,
      speed: 2.0, // Play at 2x speed
    },
  ],
};
```

---

## Error Handling

### Standard Error Response Format

```json
{
  "error": "Error message",
  "field": "fieldName"
}
```

### Common HTTP Status Codes

| Code | Meaning               | Action                        |
| ---- | --------------------- | ----------------------------- |
| 200  | Success               | Process response data         |
| 201  | Created               | Resource created successfully |
| 202  | Accepted              | Async operation started       |
| 400  | Bad Request           | Check input parameters        |
| 401  | Unauthorized          | Redirect to login             |
| 403  | Forbidden             | Check resource ownership      |
| 404  | Not Found             | Resource doesn't exist        |
| 429  | Too Many Requests     | Wait and retry                |
| 500  | Internal Server Error | Show error to user            |
| 503  | Service Unavailable   | Feature not configured        |

### Error Handling Template

```typescript
class APIError extends Error {
  constructor(
    public message: string,
    public status: number,
    public field?: string
  ) {
    super(message);
  }
}

const handleAPIRequest = async (url: string, options: RequestInit) => {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle specific errors
      if (response.status === 401) {
        window.location.href = '/login';
        throw new APIError('Please log in', 401);
      }

      if (response.status === 429) {
        const resetTime = new Date(data.resetAt);
        throw new APIError(
          `Rate limit exceeded. Try again at ${resetTime.toLocaleTimeString()}`,
          429
        );
      }

      if (response.status === 503) {
        throw new APIError(
          `Service unavailable: ${data.message || data.error}`,
          503
        );
      }

      throw new APIError(
        data.error || 'Request failed',
        response.status,
        data.field
      );
    }

    return data;
  } catch (error) {
    if (error instanceof APIError) throw error;
    throw new APIError('Network error', 0);
  }
};

// Usage
try {
  const result = await handleAPIRequest('/api/video/generate', {
    method: 'POST',
    body: JSON.stringify({...})
  });
} catch (error) {
  if (error instanceof APIError) {
    console.error(`API Error (${error.status}):`, error.message);
    if (error.field) {
      console.error('Field:', error.field);
    }
  }
}
```

---

## Rate Limiting

The API implements tiered rate limiting:

| Tier   | Limit       | Window   | Endpoints                             |
| ------ | ----------- | -------- | ------------------------------------- |
| Tier 1 | 5 requests  | 1 minute | Auth, payments, account deletion      |
| Tier 2 | 10 requests | 1 minute | Video/image/audio generation, uploads |
| Tier 3 | 30 requests | 1 minute | Status checks, read operations        |
| Tier 4 | 60 requests | 1 minute | General API operations                |

### Handling Rate Limits

**Rate Limit Headers:**

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1698123456789
```

**Automatic Retry with Backoff:**

```typescript
const requestWithRetry = async (
  apiCall: () => Promise<any>,
  maxRetries = 3
) => {
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      return await apiCall();
    } catch (error) {
      if (error.status === 429) {
        attempts++;

        if (attempts >= maxRetries) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }

        // Wait with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
        console.log(`Rate limited. Retrying in ${delay / 1000}s...`);

        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
};

// Usage
const result = await requestWithRetry(() =>
  fetch('/api/video/generate', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({...})
  }).then(r => r.json())
);
```

---

## Next Steps

### Learn More

- **[API Documentation](./API_DOCUMENTATION.md)** - Complete API reference
- **[API Examples](./API_EXAMPLES.md)** - Basic usage examples
- **[Extended Examples](./API_EXAMPLES_EXTENDED.md)** - Advanced examples
- **[OpenAPI Spec](./openapi.yaml)** - Machine-readable API specification

### Best Practices

1. **Always handle errors gracefully**
   - Check response status codes
   - Show user-friendly error messages
   - Implement retry logic for transient errors

2. **Use exponential backoff for polling**
   - Start with 5-second intervals
   - Increase delay gradually
   - Cap maximum delay at 30 seconds

3. **Validate inputs before API calls**
   - Check file sizes before upload
   - Validate UUIDs format
   - Ensure required fields are present

4. **Monitor rate limits**
   - Check rate limit headers
   - Implement request queuing
   - Show users when limits are approaching

5. **Handle async operations properly**
   - Store operation IDs for status polling
   - Show progress to users
   - Implement timeout handling

### Common Patterns

**Reusable API Client:**

```typescript
class VideoEditorAPI {
  constructor(private baseUrl = '') {}

  async createProject(title: string) {
    return this.request('/api/projects', {
      method: 'POST',
      body: { title },
    });
  }

  async generateVideo(projectId: string, prompt: string) {
    return this.request('/api/video/generate', {
      method: 'POST',
      body: {
        projectId,
        prompt,
        model: 'veo-3.1-generate-preview',
        duration: 5,
        aspectRatio: '16:9',
      },
    });
  }

  async checkVideoStatus(operationName: string, projectId: string) {
    return this.request(
      `/api/video/status?operationName=${encodeURIComponent(operationName)}&projectId=${projectId}`
    );
  }

  private async request(url: string, options?: any) {
    const response = await fetch(`${this.baseUrl}${url}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return await response.json();
  }
}

// Usage
const api = new VideoEditorAPI();

const project = await api.createProject('My Project');
const { operationName } = await api.generateVideo(project.id, 'A sunset');
// ... poll for completion
```

---

## Support

For additional help:

- **Documentation**: Review the complete API documentation
- **Examples**: Check API_EXAMPLES.md for more code samples
- **Issues**: Check GitHub repository for known issues
- **Rate Limits**: Monitor X-RateLimit-\* headers in responses

---

**Ready to build?** Start with [Workflow 1: Generate Your First Video](#1-generate-your-first-video) and you'll have a working video in minutes!
