# API Reference

**Quick reference and comprehensive examples for all API endpoints.**

Last Updated: 2025-10-25

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Authentication Examples](#authentication-examples)
3. [Project Examples](#project-examples)
4. [Asset Examples](#asset-examples)
5. [Video Generation Examples](#video-generation-examples)
6. [Audio Generation Examples](#audio-generation-examples)
7. [Export Examples](#export-examples)
8. [Advanced Examples](#advanced-examples)

---

## Quick Reference

### Endpoints Overview

| Endpoint                 | Method | Description        | Auth |
| ------------------------ | ------ | ------------------ | ---- |
| `/api/projects`          | GET    | List all projects  | ✓    |
| `/api/projects`          | POST   | Create project     | ✓    |
| `/api/projects/[id]`     | GET    | Get project        | ✓    |
| `/api/projects/[id]`     | PUT    | Update project     | ✓    |
| `/api/projects/[id]`     | DELETE | Delete project     | ✓    |
| `/api/assets`            | GET    | List assets        | ✓    |
| `/api/assets/upload`     | POST   | Upload asset       | ✓    |
| `/api/assets/[id]`       | DELETE | Delete asset       | ✓    |
| `/api/video/generate`    | POST   | Generate AI video  | ✓    |
| `/api/video/status/[op]` | GET    | Check video status | ✓    |
| `/api/audio/generate`    | POST   | Generate AI audio  | ✓    |
| `/api/export`            | POST   | Export project     | ✓    |

---

## Authentication Examples

### Sign Up

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  return data.user;
}
```

### Sign In

```typescript
async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  const accessToken = data.session.access_token;
  return accessToken;
}
```

### Sign Out

```typescript
async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
```

---

## Project Examples

### List Projects

```typescript
async function getProjects(accessToken: string) {
  const response = await fetch('/api/projects', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const { data, error } = await response.json();
  if (error) throw new Error(error);

  return data; // Project[]
}
```

### Create Project

```typescript
async function createProject(accessToken: string, title: string) {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      description: 'My new project',
      settings: {
        width: 1920,
        height: 1080,
        frameRate: 30,
      },
    }),
  });

  const { data, error } = await response.json();
  if (error) throw new Error(error);

  return data; // Project
}
```

### Get Project by ID

```typescript
async function getProject(accessToken: string, projectId: string) {
  const response = await fetch(`/api/projects/${projectId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const { data, error } = await response.json();
  if (error) throw new Error(error);

  return data; // Project
}
```

### Update Project

```typescript
async function updateProject(accessToken: string, projectId: string, updates: Partial<Project>) {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  const { data, error } = await response.json();
  if (error) throw new Error(error);

  return data; // Project
}
```

### Delete Project

```typescript
async function deleteProject(accessToken: string, projectId: string) {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const { data, error } = await response.json();
  if (error) throw new Error(error);

  return data; // { success: true }
}
```

---

## Asset Examples

### Upload Video

```typescript
async function uploadVideo(accessToken: string, projectId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('projectId', projectId);
  formData.append('type', 'video');

  const response = await fetch('/api/assets/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const { data, error } = await response.json();
  if (error) throw new Error(error);

  return data; // Asset
}
```

### Upload Audio

```typescript
async function uploadAudio(accessToken: string, projectId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('projectId', projectId);
  formData.append('type', 'audio');

  const response = await fetch('/api/assets/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const { data, error } = await response.json();
  if (error) throw new Error(error);

  return data; // Asset
}
```

### Upload Image

```typescript
async function uploadImage(accessToken: string, projectId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('projectId', projectId);
  formData.append('type', 'image');

  const response = await fetch('/api/assets/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const { data, error } = await response.json();
  if (error) throw new Error(error);

  return data; // Asset
}
```

### List Assets

```typescript
async function getAssets(accessToken: string, projectId?: string) {
  const url = projectId ? `/api/assets?projectId=${projectId}` : '/api/assets';

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const { data, error } = await response.json();
  if (error) throw new Error(error);

  return data; // Asset[]
}
```

### Delete Asset

```typescript
async function deleteAsset(accessToken: string, assetId: string) {
  const response = await fetch(`/api/assets/${assetId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const { data, error } = await response.json();
  if (error) throw new Error(error);

  return data; // { success: true }
}
```

---

## Video Generation Examples

### Generate Video (Basic)

```typescript
async function generateVideo(accessToken: string, prompt: string, duration: number) {
  const response = await fetch('/api/video/generate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      duration,
    }),
  });

  const { data, error } = await response.json();
  if (error) throw new Error(error);

  return data; // { operationName: string, status: string }
}
```

### Generate Video with Model Selection

```typescript
async function generateVideoWithModel(
  accessToken: string,
  prompt: string,
  model: 'kling' | 'minimax' | 'pixverse'
) {
  const response = await fetch('/api/video/generate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      duration: 10,
      model,
    }),
  });

  const { data, error } = await response.json();
  if (error) throw new Error(error);

  return data;
}
```

### Check Video Generation Status

```typescript
async function checkVideoStatus(accessToken: string, operationName: string) {
  const response = await fetch(`/api/video/status/${operationName}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const { data, error } = await response.json();
  if (error) throw new Error(error);

  return data; // { status: string, url?: string, progress?: number }
}
```

### Poll Until Video Complete

```typescript
async function waitForVideoCompletion(
  accessToken: string,
  operationName: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  while (true) {
    const status = await checkVideoStatus(accessToken, operationName);

    if (status.status === 'completed') {
      return status.url;
    }

    if (status.status === 'failed') {
      throw new Error('Video generation failed');
    }

    if (onProgress && status.progress) {
      onProgress(status.progress);
    }

    // Wait 5 seconds before polling again
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}
```

---

## Audio Generation Examples

### Generate Audio

```typescript
async function generateAudio(accessToken: string, prompt: string) {
  const response = await fetch('/api/audio/generate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      duration: 30,
    }),
  });

  const { data, error } = await response.json();
  if (error) throw new Error(error);

  return data; // { url: string, duration: number }
}
```

---

## Export Examples

### Export Project

```typescript
async function exportProject(accessToken: string, projectId: string, settings: ExportSettings) {
  const response = await fetch('/api/export', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      projectId,
      settings: {
        format: 'mp4',
        quality: 'high',
        resolution: '1920x1080',
        ...settings,
      },
    }),
  });

  const { data, error } = await response.json();
  if (error) throw new Error(error);

  return data; // { exportId: string, status: string }
}
```

---

## Advanced Examples

### Complete Workflow: Create Project, Upload Asset, Export

```typescript
async function completeWorkflow(accessToken: string) {
  // 1. Create project
  const project = await createProject(accessToken, 'My Video');

  // 2. Upload video
  const videoFile = await fetchVideoFile();
  const asset = await uploadVideo(accessToken, project.id, videoFile);

  // 3. Add asset to timeline (assuming timeline API)
  await addAssetToTimeline(accessToken, project.id, asset.id);

  // 4. Export project
  const exportJob = await exportProject(accessToken, project.id, {
    format: 'mp4',
    quality: 'high',
  });

  return exportJob;
}
```

### AI Video Generation Workflow

```typescript
async function aiVideoWorkflow(accessToken: string, prompt: string): Promise<string> {
  // 1. Generate video
  const { operationName } = await generateVideo(accessToken, prompt, 10);

  // 2. Poll until complete with progress
  const videoUrl = await waitForVideoCompletion(accessToken, operationName, (progress) => {
    console.log(`Generation progress: ${progress}%`);
  });

  return videoUrl;
}
```

### Batch Asset Upload

```typescript
async function uploadMultipleAssets(
  accessToken: string,
  projectId: string,
  files: File[]
): Promise<Asset[]> {
  const uploads = files.map((file) => {
    const type = getAssetType(file); // 'video' | 'audio' | 'image'
    return uploadAsset(accessToken, projectId, file, type);
  });

  return Promise.all(uploads);
}

function getAssetType(file: File): 'video' | 'audio' | 'image' {
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('image/')) return 'image';
  throw new Error('Unknown file type');
}
```

### Error Handling with Retry

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        // Rate limited - wait and retry
        const resetTime = response.headers.get('X-RateLimit-Reset');
        const waitTime = resetTime ? parseInt(resetTime) - Date.now() : 60000;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }

  throw lastError!;
}
```

---

## Additional Resources

- **[API Guide](/docs/api/API_GUIDE.md)** - Complete API documentation
- **[Provider APIs](/docs/api/providers/)** - External API documentation
- **[Webhooks](/docs/api/WEBHOOKS.md)** - Webhook implementation
- **[Rate Limiting](/docs/RATE_LIMITING.md)** - Rate limit details

---

**Last Updated:** 2025-10-25
**Consolidation:** Merged API_QUICK_REFERENCE.md, API_EXAMPLES.md, and API_EXAMPLES_EXTENDED.md
