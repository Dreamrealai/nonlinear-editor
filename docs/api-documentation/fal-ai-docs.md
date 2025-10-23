# FAL.AI API Documentation

Comprehensive documentation extracted from FAL.AI's official documentation and model pages.

**Last Updated:** October 23, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Queue System](#queue-system)
5. [Video Generation Models](#video-generation-models)
6. [Error Handling](#error-handling)
7. [Rate Limits and Pricing](#rate-limits-and-pricing)
8. [Best Practices](#best-practices)

---

## Overview

FAL.AI is a generative media platform providing ready-to-use APIs for AI models including:
- 600+ generative media models
- Text-to-image, image-to-video, video-to-video, and audio generation
- Queue-based processing for long-running tasks
- Serverless GPU infrastructure
- Real-time and streaming capabilities

### Base URLs

- **Queue API:** `https://queue.fal.run`
- **Synchronous API:** `https://fal.run`
- **Documentation:** `https://docs.fal.ai`
- **Model Explorer:** `https://fal.ai/models`

---

## Authentication

### API Key Authentication

FAL.AI uses API key-based authentication. All API requests must include the API key in the Authorization header.

#### Getting an API Key

1. Sign up at https://fal.ai/dashboard/keys
2. Create a new API key
3. Store it securely as `FAL_KEY` environment variable

#### Using the API Key

**HTTP Headers:**
```http
Authorization: Key YOUR_FAL_KEY
```

**JavaScript Client:**
```javascript
import { fal } from "@fal-ai/client";

// Via environment variable (recommended)
export FAL_KEY="YOUR_API_KEY"

// Or via client configuration
fal.config({
  credentials: "YOUR_FAL_KEY"
});
```

**Python Client:**
```python
import fal_client

# Via environment variable
export FAL_KEY="YOUR_API_KEY"

# Or via client configuration
fal_client.configure(credentials="YOUR_FAL_KEY")
```

#### Security Best Practices

- **Never expose API keys in client-side code** (browsers, mobile apps)
- Use **server-side proxy** for client-side applications
- Store keys in environment variables, not in code
- Rotate keys regularly
- Use separate keys for development and production

---

## API Endpoints

### Queue Endpoints

The queue system is designed for long-running requests (models taking more than a few seconds).

| Endpoint | Method | Description |
|----------|--------|-------------|
| `https://queue.fal.run/{model_id}` | POST | Submit request to queue |
| `https://queue.fal.run/{model_id}/{subpath}` | POST | Submit request with subpath |
| `https://queue.fal.run/{model_id}/requests/{request_id}/status` | GET | Get request status |
| `https://queue.fal.run/{model_id}/requests/{request_id}/status/stream` | GET | Stream status updates (SSE) |
| `https://queue.fal.run/{model_id}/requests/{request_id}` | GET | Get completed result |
| `https://queue.fal.run/{model_id}/requests/{request_id}/cancel` | PUT | Cancel queued request |

#### Parameters

- **model_id:** Model identifier (e.g., `fal-ai/minimax/hailuo-02/standard/image-to-video`)
- **subpath:** Optional capability path (e.g., `/dev`, `/pro`)
- **request_id:** Unique identifier returned when submitting request

---

## Queue System

### Submitting a Request

**cURL Example:**
```bash
curl -X POST https://queue.fal.run/fal-ai/minimax/hailuo-02/standard/image-to-video \
  -H "Authorization: Key $FAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Man walked into winter cave with polar bear",
    "image_url": "https://example.com/image.png"
  }'
```

**Response:**
```json
{
  "request_id": "80e732af-660e-45cd-bd63-580e4f2a94cc",
  "response_url": "https://queue.fal.run/fal-ai/minimax/hailuo-02/standard/image-to-video/requests/80e732af-660e-45cd-bd63-580e4f2a94cc",
  "status_url": "https://queue.fal.run/fal-ai/minimax/hailuo-02/standard/image-to-video/requests/80e732af-660e-45cd-bd63-580e4f2a94cc/status",
  "cancel_url": "https://queue.fal.run/fal-ai/minimax/hailuo-02/standard/image-to-video/requests/80e732af-660e-45cd-bd63-580e4f2a94cc/cancel"
}
```

**JavaScript Client:**
```javascript
import { fal } from "@fal-ai/client";

// Using subscribe (recommended - handles queue automatically)
const result = await fal.subscribe("fal-ai/minimax/hailuo-02/standard/image-to-video", {
  input: {
    prompt: "Man walked into winter cave with polar bear",
    image_url: "https://example.com/image.png"
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      update.logs.map((log) => log.message).forEach(console.log);
    }
  },
});

console.log(result.data);
console.log(result.requestId);
```

**Using Queue Directly:**
```javascript
// Submit to queue
const { request_id } = await fal.queue.submit("fal-ai/minimax/hailuo-02/standard/image-to-video", {
  input: {
    prompt: "Man walked into winter cave with polar bear",
    image_url: "https://example.com/image.png"
  },
  webhookUrl: "https://optional.webhook.url/for/results",
});

// Check status
const status = await fal.queue.status("fal-ai/minimax/hailuo-02/standard/image-to-video", {
  requestId: request_id,
  logs: true,
});

// Get result when completed
const result = await fal.queue.result("fal-ai/minimax/hailuo-02/standard/image-to-video", {
  requestId: request_id
});
```

### Request Status

**Status Types:**

1. **IN_QUEUE**
   - `queue_position`: Current position in queue
   - `response_url`: URL for result when complete

2. **IN_PROGRESS**
   - `logs`: Array of log entries (if enabled)
   - `response_url`: URL for result when complete

3. **COMPLETED**
   - `logs`: Array of log entries (if enabled)
   - `response_url`: URL to retrieve result

**Status Example:**
```json
{
  "status": "IN_QUEUE",
  "queue_position": 0,
  "response_url": "https://queue.fal.run/fal-ai/minimax/hailuo-02/standard/image-to-video/requests/80e732af-660e-45cd-bd63-580e4f2a94cc"
}
```

### Logs

Logs are **disabled by default**. Enable with `logs=1` query parameter:

```bash
curl -X GET "https://queue.fal.run/fal-ai/minimax/hailuo-02/standard/image-to-video/requests/{request_id}/status?logs=1"
```

**Log Entry Structure:**
```json
{
  "message": "INFO:TRYON:Preprocessing images...",
  "level": "STDERR | STDOUT | ERROR | INFO | WARN | DEBUG",
  "source": "stdout",
  "timestamp": "2024-12-20T15:37:17.120314"
}
```

### Streaming Status

Stream status updates using Server-Sent Events (SSE):

```bash
curl -X GET "https://queue.fal.run/fal-ai/minimax/hailuo-02/standard/image-to-video/requests/{request_id}/status/stream?logs=1" \
  --header "Authorization: Key $FAL_KEY"
```

Stream returns multiple events until completion:
```
data: {"status": "IN_PROGRESS", "request_id": "...", "logs": [...]}

data: {"status": "IN_PROGRESS", "request_id": "...", "logs": [...]}

data: {"status": "COMPLETED", "request_id": "...", "response_url": "..."}
```

### Cancelling Requests

Cancel requests that haven't started processing (status is `IN_QUEUE`):

```bash
curl -X PUT https://queue.fal.run/fal-ai/minimax/hailuo-02/standard/image-to-video/requests/{request_id}/cancel
```

**Responses:**

Success (202 Accepted):
```json
{
  "status": "CANCELLATION_REQUESTED"
}
```

Already processed (400 Bad Request):
```json
{
  "status": "ALREADY_COMPLETED"
}
```

### Webhooks

Instead of polling, configure webhook for completion notifications:

```javascript
const { request_id } = await fal.queue.submit("fal-ai/minimax/hailuo-02/standard/image-to-video", {
  input: { /* ... */ },
  webhookUrl: "https://your-server.com/webhook/callback"
});
```

Webhook receives POST request with complete result when processing finishes.

### Getting Results

Once status is `COMPLETED`, retrieve the result:

```bash
curl -X GET https://queue.fal.run/fal-ai/minimax/hailuo-02/standard/image-to-video/requests/{request_id}
```

**Result Example:**
```json
{
  "status": "COMPLETED",
  "logs": [
    {
      "message": "Processing completed",
      "level": "INFO",
      "source": "stdout",
      "timestamp": "2024-12-20T14:00:00.000000Z"
    }
  ],
  "response": {
    "video": {
      "url": "https://v3.fal.media/files/monkey/xF9OsLwGjjNURyAxD8RM1_output.mp4"
    }
  }
}
```

---

## Video Generation Models

### MiniMax Hailuo 02 (Image to Video)

**Endpoint:** `fal-ai/minimax/hailuo-02/standard/image-to-video`

Transform static images into dynamic video content with natural motion synthesis.

#### Capabilities

- Image-to-video generation with natural motion
- 768P resolution at 25fps (Standard) or 1080P (Pro)
- Processing time: ~4 minutes (Standard), ~8 minutes (Pro)
- 6-second or 10-second video output
- Optional first/last frame control

#### Input Schema

```typescript
{
  prompt: string;              // Required: Text description of desired motion
  image_url: string;           // Required: URL of input image
  duration?: "6" | "10";       // Default: "6" (10s not supported for 1080p)
  prompt_optimizer?: boolean;  // Default: true
  resolution?: "512P" | "768P"; // Default: "768P"
  end_image_url?: string;      // Optional: Last frame image
}
```

#### Example Request

```javascript
const result = await fal.subscribe("fal-ai/minimax/hailuo-02/standard/image-to-video", {
  input: {
    prompt: "Man walked into winter cave with polar bear",
    image_url: "https://storage.googleapis.com/example/image.png",
    duration: "6",
    resolution: "768P",
    prompt_optimizer: true
  },
  logs: true,
  onQueueUpdate: (update) => {
    console.log(`Status: ${update.status}`);
    if (update.status === "IN_PROGRESS" && update.logs) {
      update.logs.forEach(log => console.log(log.message));
    }
  }
});
```

#### Output Schema

```typescript
{
  video: {
    url: string;              // Generated video URL
    content_type?: string;    // MIME type
    file_name?: string;       // Filename
    file_size?: number;       // Size in bytes
  }
}
```

#### Pricing

- **768P Standard:** $0.045 per second of video
- **512P Standard:** $0.017 per second of video
- **Example:** 6-second 768P video = $0.27

#### Image Requirements

- **Aspect ratio:** Between 2:5 and 5:2
- **Minimum:** 300px on shorter side
- **Maximum file size:** 20MB
- **Supported formats:** JPG, JPEG, PNG, WebP, GIF, AVIF

#### Best Practices

1. Use high-quality source images with clear subjects
2. Write descriptive prompts specifying desired motion
3. Enable `prompt_optimizer` for improved results
4. Ensure images meet aspect ratio requirements
5. Implement proper error handling for timeouts

#### Error Handling

```javascript
try {
  const result = await fal.subscribe("fal-ai/minimax/hailuo-02/standard/image-to-video", {
    input: { /* ... */ }
  });
} catch (error) {
  if (error.type === "image_too_large") {
    console.error("Image exceeds size limits:", error.ctx);
  } else if (error.type === "generation_timeout") {
    console.error("Generation timed out, retry later");
  } else if (error.type === "content_policy_violation") {
    console.error("Content flagged by safety filters");
  }
}
```

---

### Topaz Video Upscale

**Endpoint:** `fal-ai/topaz/upscale/video`

Professional-grade video upscaling using Topaz Video AI technology.

#### Capabilities

- Video upscaling using Proteus v4
- Frame interpolation using Apollo v8
- Up to 8x upscaling
- Up to 120 FPS output
- H264 or H265 codec support

#### Input Schema

```typescript
{
  video_url: string;          // Required: URL of video to upscale
  upscale_factor?: number;    // Default: 2 (doubles width & height)
  target_fps?: number;        // Optional: Enables frame interpolation
  H264_output?: boolean;      // Default: false (uses H265)
}
```

#### Example Request

```javascript
const result = await fal.subscribe("fal-ai/topaz/upscale/video", {
  input: {
    video_url: "https://v3.fal.media/files/kangaroo/video.mp4",
    upscale_factor: 2,
    target_fps: 60,
    H264_output: false
  },
  logs: true
});
```

#### Output Schema

```typescript
{
  video: {
    url: string;              // Upscaled video URL
    content_type?: string;
    file_name?: string;
    file_size?: number;
  }
}
```

#### Pricing

- **$0.10 per second** of video processed
- Example: 10-second video = $1.00

#### Supported Formats

- **Input:** MP4, MOV, WebM, M4V, GIF
- **Output:** MP4 (H264 or H265 codec)

---

### Other Video Models

FAL.AI offers many additional video generation models:

#### Veo 3.1 (Google)
- **Endpoint:** `fal-ai/veo3.1`
- Text-to-video and image-to-video
- State-of-the-art quality with audio
- Fast variant available

#### Sora 2 (OpenAI)
- **Endpoint:** `fal-ai/sora-2/text-to-video`
- High-quality video with audio
- Pro and Standard tiers
- Video remix capabilities

#### Kling Video
- **Endpoint:** `fal-ai/kling-video/v2.5-turbo/pro/image-to-video`
- Cinematic visuals
- Exceptional prompt precision
- Multiple quality tiers

#### LTX Video
- **Endpoint:** `fal-ai/ltxv-2/text-to-video`
- Fast generation
- High-fidelity output with audio

---

## Error Handling

### Error Response Structure

FAL.AI returns standardized error responses:

```json
{
  "detail": [
    {
      "loc": ["body", "field_name"],
      "msg": "Human-readable error message",
      "type": "machine_readable_error_type",
      "url": "https://docs.fal.ai/errors/#error_type",
      "ctx": {
        "additional": "context"
      },
      "input": "value_that_caused_error"
    }
  ]
}
```

### HTTP Headers

- **X-Fal-Retryable:** `"true"` or `"false"` - indicates if retry might succeed

### Common Error Types

#### 1. Internal Server Error
- **Type:** `internal_server_error`
- **Status:** 500
- **Retryable:** May be true or false
- **Action:** Check status, retry if retryable

#### 2. Generation Timeout
- **Type:** `generation_timeout`
- **Status:** 504
- **Retryable:** May be true or false
- **Action:** Simplify input or retry later

#### 3. Content Policy Violation
- **Type:** `content_policy_violation`
- **Status:** 422
- **Retryable:** false
- **Action:** Modify content to comply with policies
- **Note:** Applies to NSFW, violence, hate speech, illegal content

#### 4. Image Too Large
- **Type:** `image_too_large`
- **Status:** 422
- **Retryable:** false
- **Context:** `max_height`, `max_width`
- **Action:** Resize image to within limits

#### 5. Image Too Small
- **Type:** `image_too_small`
- **Status:** 422
- **Retryable:** false
- **Context:** `min_height`, `min_width`
- **Action:** Use higher resolution image

#### 6. Image Load Error
- **Type:** `image_load_error`
- **Status:** 422
- **Retryable:** false
- **Action:** Check image format and integrity

#### 7. File Download Error
- **Type:** `file_download_error`
- **Status:** 422
- **Retryable:** false
- **Action:** Ensure URL is publicly accessible

#### 8. Video Duration Too Long
- **Type:** `video_duration_too_long`
- **Status:** 422
- **Retryable:** false
- **Context:** `max_duration`, `provided_duration`
- **Action:** Trim video to maximum duration

#### 9. Unsupported Format
- **Types:** `unsupported_image_format`, `unsupported_video_format`, `unsupported_audio_format`
- **Status:** 422
- **Retryable:** false
- **Context:** `supported_formats`
- **Action:** Convert to supported format

#### 10. Validation Errors
- **Types:** `greater_than`, `less_than`, `multiple_of`, `sequence_too_long`
- **Status:** 422
- **Retryable:** false
- **Context:** Specific validation constraints
- **Action:** Adjust input to meet constraints

### Error Handling Best Practices

```javascript
async function handleFalRequest(modelId, input) {
  try {
    const result = await fal.subscribe(modelId, { input });
    return result;
  } catch (error) {
    // Check if retryable
    const isRetryable = error.headers?.['x-fal-retryable'] === 'true';

    // Handle specific error types
    switch (error.type) {
      case 'content_policy_violation':
        throw new Error('Content violates usage policies. Please modify input.');

      case 'image_too_large':
        const { max_height, max_width } = error.ctx;
        throw new Error(`Image exceeds ${max_width}x${max_height}px limit`);

      case 'generation_timeout':
        if (isRetryable) {
          console.log('Timeout - retrying...');
          return await handleFalRequest(modelId, input); // Retry
        }
        throw new Error('Generation timed out');

      case 'internal_server_error':
        if (isRetryable) {
          console.log('Server error - retrying...');
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
          return await handleFalRequest(modelId, input); // Retry
        }
        throw new Error('Internal server error');

      default:
        throw error;
    }
  }
}
```

---

## Rate Limits and Pricing

### Rate Limits

- No hard rate limits specified in documentation
- Queue system handles concurrent requests automatically
- Usage-based pricing applies

### Pricing Models

#### Pay-Per-Use
- No subscription required
- Pay only for what you generate
- No hidden fees or minimum commitments

#### Model-Specific Pricing

**Video Models:**
- MiniMax Hailuo 02 Standard (768P): $0.045/sec
- MiniMax Hailuo 02 Standard (512P): $0.017/sec
- MiniMax Hailuo 02 Pro (1080P): $0.08/sec
- Topaz Video Upscale: $0.10/sec

**Image Models:**
- Pricing varies by model
- Check individual model documentation

### Pricing Page
For detailed pricing: https://fal.ai/pricing

### Enterprise Solutions
For custom pricing and dedicated resources:
- Contact: support@fal.ai
- Enterprise page: https://fal.ai/enterprise

---

## Best Practices

### 1. Authentication Security

- Store API keys in environment variables
- Use server-side proxy for client apps
- Never commit keys to version control
- Rotate keys regularly
- Use separate keys per environment

### 2. Queue Management

- Use `subscribe()` for automatic queue handling
- Implement webhooks for long-running tasks
- Enable logs for debugging
- Handle status updates appropriately
- Implement proper error handling

### 3. File Handling

**Upload Files:**
```javascript
// Upload file to FAL storage
const file = new File(["data"], "file.txt", { type: "text/plain" });
const url = await fal.storage.upload(file);

// Use in request
const result = await fal.subscribe(modelId, {
  input: { image_url: url }
});
```

**Supported Input Methods:**
1. Public URLs (ensure CORS/rate limits)
2. Base64 Data URIs (impacts performance for large files)
3. FAL Storage URLs (recommended)

### 4. Error Handling

- Always wrap requests in try-catch
- Check `X-Fal-Retryable` header
- Use error `type` for logic, not `msg`
- Implement exponential backoff for retries
- Log errors for monitoring

### 5. Performance Optimization

- Use appropriate model endpoints (standard vs fast)
- Optimize input sizes (images, videos)
- Batch similar requests when possible
- Cache results when appropriate
- Monitor processing times

### 6. Input Validation

- Validate inputs before submission
- Check file sizes and formats
- Verify aspect ratios for images
- Ensure URLs are accessible
- Test content policy compliance

### 7. Monitoring and Logging

```javascript
const result = await fal.subscribe(modelId, {
  input: { /* ... */ },
  logs: true,
  onQueueUpdate: (update) => {
    // Log status changes
    console.log(`Status: ${update.status}`);

    // Log queue position
    if (update.queue_position !== undefined) {
      console.log(`Queue position: ${update.queue_position}`);
    }

    // Log processing messages
    if (update.logs) {
      update.logs.forEach(log => {
        console.log(`[${log.level}] ${log.message}`);
      });
    }
  }
});
```

---

## File Uploads

### Storage API

FAL provides convenient file storage:

```javascript
// Upload file
const file = new File([data], "filename.ext", { type: "mime/type" });
const url = await fal.storage.upload(file);

// Use in request
const result = await fal.subscribe(modelId, {
  input: { file_url: url }
});
```

### Auto-Upload

The client automatically uploads binary objects:

```javascript
const file = new File([imageData], "image.png", { type: "image/png" });

// File is auto-uploaded
const result = await fal.subscribe(modelId, {
  input: { image: file }  // Automatically uploaded
});
```

### Supported Input Formats

**Images:** JPG, JPEG, PNG, WebP, GIF, AVIF
**Videos:** MP4, MOV, WebM, M4V
**Audio:** MP3, WAV, OGG, FLAC

---

## Client Libraries

### JavaScript/TypeScript

**Installation:**
```bash
npm install @fal-ai/client
```

**Basic Usage:**
```javascript
import { fal } from "@fal-ai/client";

fal.config({
  credentials: process.env.FAL_KEY
});

const result = await fal.subscribe(modelId, {
  input: { /* ... */ }
});
```

### Python

**Installation:**
```bash
pip install fal-client
```

**Basic Usage:**
```python
import fal_client

fal_client.configure(
    credentials=os.getenv("FAL_KEY")
)

result = fal_client.subscribe(model_id, arguments={
    "input": { /* ... */ }
})
```

---

## Additional Resources

### Documentation
- Main Docs: https://docs.fal.ai
- Model APIs: https://docs.fal.ai/model-apis
- Queue API: https://docs.fal.ai/model-apis/model-endpoints/queue
- Error Reference: https://docs.fal.ai/model-apis/errors

### Tools
- Model Explorer: https://fal.ai/models
- Dashboard: https://fal.ai/dashboard
- API Keys: https://fal.ai/dashboard/keys

### Community
- Discord: https://discord.gg/fal-ai
- Status Page: https://status.fal.ai
- Blog: https://blog.fal.ai

### Support
- Email: support@fal.ai
- Documentation: https://docs.fal.ai/model-apis/support

---

## Appendix: Complete Model List

### Video Generation

**Image-to-Video:**
- `fal-ai/minimax/hailuo-02/standard/image-to-video` - MiniMax Hailuo 02
- `fal-ai/kling-video/v2.5-turbo/pro/image-to-video` - Kling Video Pro
- `fal-ai/veo3.1/image-to-video` - Google Veo 3.1
- `fal-ai/sora-2/image-to-video` - OpenAI Sora 2
- `fal-ai/ltxv-2/image-to-video` - LTX Video
- `fal-ai/wan-25-preview/image-to-video` - Wan 2.5

**Text-to-Video:**
- `fal-ai/veo3.1` - Google Veo 3.1
- `fal-ai/sora-2/text-to-video` - OpenAI Sora 2
- `fal-ai/kling-video/v2.5-turbo/pro/text-to-video` - Kling Video Pro
- `fal-ai/ltxv-2/text-to-video` - LTX Video
- `fal-ai/minimax/hailuo-02/text-to-video` - MiniMax Text-to-Video

**Video Enhancement:**
- `fal-ai/topaz/upscale/video` - Topaz Video Upscale
- `fal-ai/sora-2/video-to-video/remix` - Sora Video Remix

### Image Generation

**Text-to-Image:**
- `fal-ai/flux/dev` - FLUX.1 [dev]
- `fal-ai/flux/schnell` - FLUX.1 [schnell]
- `fal-ai/flux-pro/v1.1-ultra` - FLUX.1 Pro Ultra
- `fal-ai/imagen4/preview` - Google Imagen 4
- `fal-ai/recraft/v3/text-to-image` - Recraft V3

**Image-to-Image:**
- `fal-ai/flux-pro/kontext` - FLUX Kontext
- `fal-ai/nano-banana/edit` - Nano Banana
- `fal-ai/reve/edit` - Reve Edit
- `fal-ai/topaz/upscale/image` - Topaz Image Upscale

### Audio Generation

- `fal-ai/chatterbox/text-to-speech` - Chatterbox TTS
- `fal-ai/minimax/speech-02-hd` - MiniMax Speech HD
- `fal-ai/beatoven/music-generation` - Music Generation
- `fal-ai/beatoven/sound-effect-generation` - Sound Effects

---

**End of Documentation**

For the most up-to-date information, always refer to the official FAL.AI documentation at https://docs.fal.ai
