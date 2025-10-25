# Google AI & Cloud Services

This directory contains documentation for Google's AI and cloud services used in the application.

## Services Overview

### Video Generation

#### Veo 2 ([VEO2.md](./VEO2.md))

- **Model:** `veo-002`
- **Max Duration:** 60 seconds
- **Resolution:** 1080p
- **Status:** Production-ready
- **Use Case:** General video generation

#### Veo 3 ([VEO3.md](./VEO3.md))

- **Model:** `veo-003`
- **Max Duration:** 120 seconds
- **Resolution:** 1080p
- **Status:** Production-ready, latest model
- **Use Case:** Longer, higher quality videos

### Image Generation

#### Imagen 3 ([IMAGEN.md](./IMAGEN.md))

- **Model:** `imagen-3.0-generate-001`
- **Max Resolution:** 1024x1024
- **Status:** Production-ready
- **Use Case:** High-quality image generation

### Multimodal AI

#### Gemini 2.5 Flash ([GEMINI.md](./GEMINI.md))

- **Model:** `gemini-2.5-flash-001`
- **Status:** Production-ready
- **Use Case:** Chat, content analysis, multimodal understanding

### Video Analysis

#### Cloud Vision ([CLOUD_VISION.md](./CLOUD_VISION.md))

- **Service:** Cloud Vision Video Intelligence API
- **Status:** Production-ready
- **Use Case:** Scene detection, label detection, shot analysis

## Quick Start

### 1. Setup Google Cloud Project

1. Create a Google Cloud project
2. Enable Vertex AI API
3. Enable Cloud Vision API (for video analysis)
4. Create a service account with appropriate permissions

### 2. Configure Service Account

```bash
# Download service account JSON
# Set environment variable
GOOGLE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"..."}'
```

### 3. Test Connection

```typescript
import { testGoogleConnection } from '@/lib/services/google-ai';

const isConnected = await testGoogleConnection();
console.log('Google AI connected:', isConnected);
```

## Authentication

All Google services use a single service account for authentication:

```typescript
// Environment variable (JSON string)
GOOGLE_SERVICE_ACCOUNT = '{"type":"service_account",...}';

// Required permissions:
// - aiplatform.endpoints.predict
// - storage.objects.create
// - storage.objects.get
```

### Service Account Permissions

The service account needs these roles:

- **Vertex AI User** - For Veo, Imagen, Gemini
- **Storage Admin** - For video/image storage
- **Cloud Vision User** - For video analysis (optional)

## Usage Examples

### Generate Video with Veo

```typescript
import { generateVeoVideo } from '@/lib/services/google-ai/veo';

const video = await generateVeoVideo({
  prompt: 'A cat playing piano in a jazz club',
  duration: 5, // seconds
  model: 'veo-003', // or 'veo-002'
  aspectRatio: '16:9',
});

console.log('Video URL:', video.url);
```

### Generate Image with Imagen

```typescript
import { generateImagen } from '@/lib/services/google-ai/imagen';

const image = await generateImagen({
  prompt: 'A serene mountain landscape at sunset',
  width: 1024,
  height: 1024,
  negativePrompt: 'people, buildings',
});

console.log('Image URL:', image.url);
```

### Chat with Gemini

```typescript
import { chatWithGemini } from '@/lib/services/google-ai/gemini';

const response = await chatWithGemini({
  messages: [{ role: 'user', content: 'Explain quantum computing' }],
  model: 'gemini-2.5-flash-001',
  temperature: 0.7,
});

console.log('Response:', response.content);
```

### Analyze Video with Cloud Vision

```typescript
import { analyzeVideo } from '@/lib/services/google-ai/cloud-vision';

const analysis = await analyzeVideo({
  videoUrl: 'gs://bucket/video.mp4',
  features: ['SHOT_CHANGE_DETECTION', 'LABEL_DETECTION'],
});

console.log('Scenes:', analysis.scenes);
console.log('Labels:', analysis.labels);
```

## Service Comparison

### When to Use Each Service

| Service      | Best For                       | Cost   | Speed     |
| ------------ | ------------------------------ | ------ | --------- |
| Veo 2        | General videos, cost-effective | Medium | Fast      |
| Veo 3        | High-quality, longer videos    | High   | Slower    |
| Imagen       | Images, thumbnails, stills     | Medium | Fast      |
| Gemini       | Chat, analysis, planning       | Low    | Very Fast |
| Cloud Vision | Video understanding            | Low    | Fast      |

### Cost Estimates

Approximate costs (varies by region):

- **Veo 2:** ~$0.10-0.20 per video
- **Veo 3:** ~$0.20-0.40 per video
- **Imagen:** ~$0.02-0.04 per image
- **Gemini:** ~$0.0001 per 1K tokens
- **Cloud Vision:** ~$0.10 per minute analyzed

## Rate Limits

Default rate limits per project:

- **Veo:** 10 requests/minute, 1000/day
- **Imagen:** 100 requests/minute, 10000/day
- **Gemini:** 1000 requests/minute, unlimited daily
- **Cloud Vision:** 1800 requests/minute

Request quota increases through Google Cloud console if needed.

## Error Handling

### Common Errors

#### 401 Unauthorized

```
Error: Request had invalid authentication credentials
```

**Solution:**

- Check `GOOGLE_SERVICE_ACCOUNT` is set correctly
- Verify service account has required permissions
- Check service account key hasn't expired

#### 403 Forbidden

```
Error: Permission denied on resource project
```

**Solution:**

- Enable required APIs in Google Cloud console
- Add required IAM roles to service account
- Check quota limits

#### 429 Too Many Requests

```
Error: Quota exceeded for quota metric 'Generate requests'
```

**Solution:**

- Implement exponential backoff
- Request quota increase
- Distribute load across multiple projects

#### 503 Service Unavailable

```
Error: The service is currently unavailable
```

**Solution:**

- Retry with exponential backoff
- Check Google Cloud status page
- Implement fallback to alternative model

### Retry Strategy

```typescript
import { retryWithBackoff } from '@/lib/utils/retry';

const video = await retryWithBackoff(() => generateVeoVideo(params), {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
});
```

## Best Practices

### 1. Prompt Engineering

**Good prompts:**

- Clear and specific
- Include style/mood descriptors
- Specify camera angles/movement
- Define lighting and atmosphere

**Example:**

```
"A close-up shot of a golden retriever puppy playing in a sunny meadow,
soft natural lighting, shallow depth of field, warm color palette"
```

### 2. Model Selection

- **Veo 2** for quick iterations and prototypes
- **Veo 3** for final production videos
- **Imagen** for thumbnails and static images
- **Gemini** for planning and storyboarding

### 3. Cost Optimization

- Cache results when possible
- Use lower-cost models for testing
- Batch similar requests
- Implement request deduplication

### 4. Error Handling

- Always implement retry logic
- Log errors with context
- Provide fallbacks
- Monitor quota usage

## Monitoring

### Track Usage

```typescript
// Get usage statistics
GET /api/admin/google-usage

// Response:
{
  "veo": { "requests": 1250, "cost": 125.00 },
  "imagen": { "requests": 3400, "cost": 68.00 },
  "gemini": { "requests": 15000, "cost": 1.50 }
}
```

### Set Alerts

Configure alerts for:

- Quota approaching limits (80%)
- High error rates (>5%)
- Unusual cost spikes
- API availability issues

## Related Documentation

- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Cloud Vision Documentation](https://cloud.google.com/vision/docs)
- [API Documentation](../../API_DOCUMENTATION.md)
- [Environment Variables](/docs/setup/ENVIRONMENT_VARIABLES.md)

## Troubleshooting Guide

### Video Generation Issues

**Problem:** Videos are low quality
**Solution:**

- Use Veo 3 instead of Veo 2
- Improve prompt specificity
- Adjust aspect ratio for content

**Problem:** Generation timeout
**Solution:**

- Reduce duration
- Simplify prompt
- Check service status

### Image Generation Issues

**Problem:** Images don't match prompt
**Solution:**

- Add negative prompts
- Be more specific with style
- Use reference images

### Authentication Issues

**Problem:** Service account errors
**Solution:**

- Verify JSON format is valid
- Check all required fields present
- Ensure no extra whitespace
- Test with gcloud CLI

---

**Last Updated:** 2025-10-24
**Services:** 5 (Veo 2, Veo 3, Imagen, Gemini, Cloud Vision)
**Status:** Production-ready
