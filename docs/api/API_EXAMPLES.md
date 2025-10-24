# API Examples and Use Cases

> **Practical examples for common API workflows**
>
> Version: 1.0.0
> Last Updated: 2025-10-24

## Table of Contents

- [Authentication](#authentication)
- [Video Generation Workflow](#video-generation-workflow)
- [Image Generation](#image-generation)
- [Audio Generation](#audio-generation)
- [Asset Management](#asset-management)
- [Project Management](#project-management)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

---

## Authentication

All API requests require an authenticated session. The session cookie is automatically managed by the browser when using the web application.

### Checking Authentication Status

```javascript
// Frontend example using fetch
const response = await fetch('/api/user/profile', {
  credentials: 'include', // Include cookies
});

if (response.status === 401) {
  // User not authenticated - redirect to login
  window.location.href = '/login';
}
```

---

## Video Generation Workflow

### Example 1: Generate Text-to-Video with Google Veo

**Step 1: Initiate Video Generation**

```javascript
const generateVideo = async () => {
  const response = await fetch('/api/video/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      prompt: 'A serene lake at sunset with mountains in the background and birds flying',
      projectId: '123e4567-e89b-12d3-a456-426614174000',
      model: 'veo-3.1-generate-preview',
      duration: 5,
      aspectRatio: '16:9',
      resolution: '1080p',
      generateAudio: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const data = await response.json();
  return data.operationName; // Save this for status polling
};

// Usage
try {
  const operationName = await generateVideo();
  console.log('Video generation started:', operationName);
} catch (error) {
  console.error('Failed to start video generation:', error.message);
}
```

**Step 2: Poll for Status**

```javascript
const pollVideoStatus = async (operationName, projectId) => {
  const response = await fetch(
    `/api/video/status?operationName=${encodeURIComponent(operationName)}&projectId=${projectId}`,
    {
      credentials: 'include',
    }
  );

  if (!response.ok) {
    throw new Error('Failed to check video status');
  }

  return await response.json();
};

// Polling loop with exponential backoff
const waitForVideoCompletion = async (operationName, projectId) => {
  let delay = 5000; // Start with 5 seconds
  const maxDelay = 30000; // Max 30 seconds between polls

  while (true) {
    const status = await pollVideoStatus(operationName, projectId);

    if (status.done) {
      if (status.error) {
        throw new Error(status.error);
      }
      return status.asset; // Video is ready!
    }

    console.log(`Progress: ${status.progress}%`);

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Increase delay (exponential backoff)
    delay = Math.min(delay * 1.2, maxDelay);
  }
};

// Usage
try {
  const operationName = await generateVideo();
  const asset = await waitForVideoCompletion(operationName, '123e4567-e89b-12d3-a456-426614174000');
  console.log('Video generated successfully!', asset);
} catch (error) {
  console.error('Video generation failed:', error.message);
}
```

### Example 2: Image-to-Video with FAL.ai

```javascript
const generateImageToVideo = async (imageAssetId) => {
  const response = await fetch('/api/video/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      prompt: 'The cat starts walking across the room, looking curious',
      projectId: '123e4567-e89b-12d3-a456-426614174000',
      model: 'seedance-1.0-pro',
      imageAssetId: imageAssetId, // Reference to uploaded image
      duration: 4,
      aspectRatio: '16:9',
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate video');
  }

  return data.operationName;
};
```

### Error Handling Example

```javascript
const generateVideoWithErrorHandling = async (params) => {
  try {
    const response = await fetch('/api/video/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle specific error cases
      switch (response.status) {
        case 400:
          throw new Error(`Invalid input: ${data.error}. Field: ${data.field}`);
        case 401:
          throw new Error('Please log in to generate videos');
        case 403:
          throw new Error('You do not have access to this project');
        case 429:
          const resetTime = new Date(data.resetAt);
          throw new Error(`Rate limit exceeded. Try again after ${resetTime.toLocaleTimeString()}`);
        case 500:
          throw new Error(
            'Video generation service is temporarily unavailable. Please try again later.'
          );
        default:
          throw new Error(data.error || 'An unexpected error occurred');
      }
    }

    return data;
  } catch (error) {
    // Log error for debugging
    console.error('Video generation error:', error);

    // Show user-friendly message
    alert(error.message);

    throw error;
  }
};
```

---

## Image Generation

### Example: Generate Multiple Images

```javascript
const generateImages = async () => {
  const response = await fetch('/api/image/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      prompt: 'A futuristic city skyline at night with neon lights',
      projectId: '123e4567-e89b-12d3-a456-426614174000',
      aspectRatio: '16:9',
      sampleCount: 4, // Generate 4 variations
      safetyFilterLevel: 'block_some',
      personGeneration: 'dont_allow',
      seed: 42, // For reproducible results
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Image generation failed');
  }

  return data.assets; // Array of generated images
};

// Usage
try {
  const images = await generateImages();
  console.log(`Generated ${images.length} images`);

  images.forEach((image, index) => {
    console.log(`Image ${index + 1}:`, image.metadata.sourceUrl);
  });
} catch (error) {
  console.error('Failed to generate images:', error.message);
}
```

---

## Audio Generation

### Example 1: Text-to-Speech

```javascript
const generateSpeech = async (text) => {
  const response = await fetch('/api/audio/elevenlabs/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      text: text,
      projectId: '123e4567-e89b-12d3-a456-426614174000',
      voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah voice
      stability: 0.7,
      similarity: 0.8,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 504) {
      throw new Error('Speech generation timed out. Try with shorter text.');
    }
    throw new Error(data.error || 'Speech generation failed');
  }

  return data.asset;
};

// Usage with long text
const longText = 'This is a longer narrative that will be converted to speech...';
try {
  const audioAsset = await generateSpeech(longText);
  console.log('Speech audio generated:', audioAsset.metadata.filename);
} catch (error) {
  console.error('Speech generation failed:', error.message);
}
```

### Example 2: Music Generation

```javascript
const generateMusic = async () => {
  // Step 1: Start music generation
  const response = await fetch('/api/audio/suno/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      prompt: 'Upbeat electronic dance music with energetic synths',
      projectId: '123e4567-e89b-12d3-a456-426614174000',
      customMode: false,
      instrumental: false,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Music generation failed');
  }

  const taskId = data.taskId;

  // Step 2: Poll for completion
  const checkStatus = async () => {
    const statusResponse = await fetch(
      `/api/audio/suno/status?taskId=${taskId}&projectId=123e4567-e89b-12d3-a456-426614174000`,
      { credentials: 'include' }
    );

    return await statusResponse.json();
  };

  // Wait for completion
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max (5s intervals)

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const status = await checkStatus();

    if (status.tasks && status.tasks.length > 0) {
      const task = status.tasks[0];
      if (task.status === 'completed' && task.audioUrl) {
        return task;
      }
      console.log('Music generation in progress...');
    }

    attempts++;
  }

  throw new Error('Music generation timed out');
};

// Usage
try {
  const music = await generateMusic();
  console.log('Music generated!', music.audioUrl);
} catch (error) {
  console.error('Music generation failed:', error.message);
}
```

---

## Asset Management

### Example 1: Upload a Video File

```javascript
const uploadVideo = async (file, projectId) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('projectId', projectId);
  formData.append('type', 'video');

  const response = await fetch('/api/assets/upload', {
    method: 'POST',
    credentials: 'include',
    body: formData, // Don't set Content-Type header - browser will set it with boundary
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 413) {
      throw new Error('File is too large. Maximum size is 100MB.');
    }
    if (response.status === 415) {
      throw new Error('Invalid file type. Please upload an MP4, WebM, or MOV file.');
    }
    throw new Error(data.error || 'Upload failed');
  }

  return data.assetId;
};

// Usage with file input
document.getElementById('fileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];

  if (!file) return;

  // Validate file size client-side
  if (file.size > 100 * 1024 * 1024) {
    alert('File is too large. Maximum size is 100MB.');
    return;
  }

  try {
    const assetId = await uploadVideo(file, '123e4567-e89b-12d3-a456-426614174000');
    console.log('Video uploaded successfully:', assetId);
  } catch (error) {
    alert(`Upload failed: ${error.message}`);
  }
});
```

### Example 2: List and Filter Assets

```javascript
const listAssets = async (projectId, type = null, page = 0, pageSize = 20) => {
  const params = new URLSearchParams({
    projectId: projectId,
    page: page.toString(),
    pageSize: pageSize.toString(),
  });

  if (type) {
    params.append('type', type);
  }

  const response = await fetch(`/api/assets?${params.toString()}`, {
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch assets');
  }

  return data;
};

// Usage: Get all video assets with pagination
const loadVideos = async () => {
  try {
    const result = await listAssets(
      '123e4567-e89b-12d3-a456-426614174000',
      'video',
      0, // First page
      20 // 20 items per page
    );

    console.log(`Found ${result.pagination.totalCount} videos`);
    console.log(`Showing page ${result.pagination.page + 1} of ${result.pagination.totalPages}`);

    result.assets.forEach((asset) => {
      console.log(`- ${asset.metadata.filename}`);
    });

    // Load next page if available
    if (result.pagination.hasNextPage) {
      console.log('Has more videos...');
    }
  } catch (error) {
    console.error('Failed to load videos:', error.message);
  }
};
```

### Example 3: Get Signed URL for Asset

```javascript
const getAssetSignedUrl = async (assetId, ttl = 3600) => {
  const response = await fetch(`/api/assets/sign?assetId=${assetId}&ttl=${ttl}`, {
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate signed URL');
  }

  return data.signedUrl;
};

// Usage: Display video in video player
const displayVideo = async (assetId) => {
  try {
    const signedUrl = await getAssetSignedUrl(assetId, 7200); // 2 hour expiry

    const videoElement = document.getElementById('video-player');
    videoElement.src = signedUrl;
    videoElement.load();
  } catch (error) {
    console.error('Failed to load video:', error.message);
  }
};
```

---

## Project Management

### Example: Create a New Project

```javascript
const createProject = async (title) => {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      title: title || 'Untitled Project',
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 400 && data.field === 'title') {
      throw new Error('Project title must be between 1 and 200 characters');
    }
    throw new Error(data.error || 'Failed to create project');
  }

  return data;
};

// Usage
try {
  const project = await createProject('My New Video Project');
  console.log('Project created:', project.id);

  // Redirect to editor
  window.location.href = `/editor/${project.id}`;
} catch (error) {
  console.error('Project creation failed:', error.message);
}
```

---

## Error Handling

### Comprehensive Error Handler

```javascript
class APIError extends Error {
  constructor(message, status, field) {
    super(message);
    this.status = status;
    this.field = field;
    this.name = 'APIError';
  }
}

const apiRequest = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      // Provide user-friendly error messages
      let message = data.error || 'An error occurred';

      switch (response.status) {
        case 400:
          message = data.field ? `Invalid ${data.field}: ${data.error}` : data.error;
          break;
        case 401:
          message = 'Please log in to continue';
          // Redirect to login
          window.location.href = '/login';
          break;
        case 403:
          message = 'You do not have permission to perform this action';
          break;
        case 404:
          message = 'The requested resource was not found';
          break;
        case 429:
          const resetTime = new Date(data.resetAt);
          message = `Too many requests. Please wait until ${resetTime.toLocaleTimeString()}`;
          break;
        case 500:
          message = 'A server error occurred. Please try again later';
          break;
        case 503:
          message = 'Service temporarily unavailable. Please try again';
          break;
        case 504:
          message = 'Request timed out. Please try again';
          break;
      }

      throw new APIError(message, response.status, data.field);
    }

    return data;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }

    // Network error or JSON parsing error
    throw new APIError('Network error. Please check your connection and try again', 0);
  }
};

// Usage
try {
  const result = await apiRequest('/api/video/generate', {
    method: 'POST',
    body: JSON.stringify({
      prompt: 'A beautiful sunset',
      projectId: '123e4567-e89b-12d3-a456-426614174000',
      model: 'veo-3.1-generate-preview',
    }),
  });
  console.log('Success:', result);
} catch (error) {
  if (error instanceof APIError) {
    console.error(`API Error (${error.status}):`, error.message);
    if (error.field) {
      console.error('Field:', error.field);
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

---

## Rate Limiting

### Handling Rate Limits

```javascript
class RateLimitHandler {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  async executeWithRetry(apiCall, maxRetries = 3) {
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

          // Wait before retry (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
          console.log(`Rate limited. Retrying in ${delay / 1000}s...`);

          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
  }
}

// Usage
const rateLimiter = new RateLimitHandler();

const generateVideoWithRateLimit = async (params) => {
  return rateLimiter.executeWithRetry(async () => {
    return await apiRequest('/api/video/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  });
};

try {
  const result = await generateVideoWithRateLimit({
    prompt: 'A beautiful landscape',
    projectId: '123e4567-e89b-12d3-a456-426614174000',
    model: 'veo-3.1-generate-preview',
  });
  console.log('Video generation started:', result.operationName);
} catch (error) {
  console.error('Failed after retries:', error.message);
}
```

---

## Best Practices

### 1. Always Handle Errors

```javascript
// Good
try {
  const result = await apiCall();
  // Handle success
} catch (error) {
  // Handle error
  console.error(error);
  showUserErrorMessage(error.message);
}

// Bad
const result = await apiCall(); // Unhandled promise rejection
```

### 2. Implement Exponential Backoff for Polling

```javascript
// Good
let delay = 5000;
const maxDelay = 30000;

while (!done) {
  await sleep(delay);
  delay = Math.min(delay * 1.2, maxDelay);
}

// Bad
while (!done) {
  await sleep(1000); // Too aggressive
}
```

### 3. Validate Input Before API Calls

```javascript
// Good
if (!projectId || !prompt || prompt.length < 3) {
  throw new Error('Invalid input');
}

const result = await generateVideo(projectId, prompt);

// Bad
const result = await generateVideo(projectId, prompt); // Server will reject
```

### 4. Use Appropriate Timeouts

```javascript
// Good - reasonable timeout
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 60000);

try {
  const response = await fetch(url, { signal: controller.signal });
  clearTimeout(timeout);
} catch (error) {
  if (error.name === 'AbortError') {
    // Handle timeout
  }
}
```

---

## Complete Integration Example

Here's a complete example showing how to integrate multiple APIs:

```javascript
class VideoEditorAPI {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  async createProjectAndGenerateVideo(title, prompt) {
    // Step 1: Create project
    const project = await this.createProject(title);
    console.log('Project created:', project.id);

    // Step 2: Generate video
    const operationName = await this.generateVideo(project.id, prompt);
    console.log('Video generation started');

    // Step 3: Wait for video
    const asset = await this.waitForVideo(operationName, project.id);
    console.log('Video ready!', asset);

    return {
      project,
      asset,
    };
  }

  async createProject(title) {
    const response = await fetch(`${this.baseUrl}/api/projects`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      throw new Error('Failed to create project');
    }

    return await response.json();
  }

  async generateVideo(projectId, prompt) {
    const response = await fetch(`${this.baseUrl}/api/video/generate`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        prompt,
        model: 'veo-3.1-generate-preview',
        duration: 5,
        aspectRatio: '16:9',
        generateAudio: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate video');
    }

    const data = await response.json();
    return data.operationName;
  }

  async waitForVideo(operationName, projectId) {
    let delay = 5000;
    const maxDelay = 30000;

    while (true) {
      const response = await fetch(
        `${this.baseUrl}/api/video/status?operationName=${encodeURIComponent(operationName)}&projectId=${projectId}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to check video status');
      }

      const status = await response.json();

      if (status.done) {
        if (status.error) {
          throw new Error(status.error);
        }
        return status.asset;
      }

      console.log(`Progress: ${status.progress}%`);

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.2, maxDelay);
    }
  }
}

// Usage
const api = new VideoEditorAPI();

try {
  const result = await api.createProjectAndGenerateVideo(
    'My Awesome Video',
    'A majestic mountain range at sunrise'
  );

  console.log('All done!', result);
} catch (error) {
  console.error('Workflow failed:', error.message);
}
```

---

## Additional Resources

- [API Documentation](/docs/api/API_DOCUMENTATION.md) - Full API reference
- [API Quick Reference](/docs/api/API_QUICK_REFERENCE.md) - Quick lookup guide
- [Rate Limiting](/docs/RATE_LIMITING.md) - Rate limiting details
- [Error Codes](/docs/api/API_DOCUMENTATION.md#error-handling) - Complete error code reference
