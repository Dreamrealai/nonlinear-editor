# Sora 2 Video Generation API (via fal.ai)

## Overview

Sora 2 is OpenAI's state-of-the-art video generation model, available through fal.ai. It can create richly detailed, dynamic video clips with audio from text prompts or images.

## Base URL

```
https://fal.ai
```

## Authentication

Set `FAL_KEY` as an environment variable:

```bash
export FAL_KEY="YOUR_API_KEY"
```

Or configure in code:

```typescript
import { fal } from '@fal-ai/client';

fal.config({
  credentials: 'YOUR_FAL_KEY',
});
```

## Models

### Sora 2 Text-to-Video

**Endpoint**: `fal-ai/sora-2/text-to-video`

Generate videos from text prompts with synchronized audio.

**Features**:

- Resolution: 720p
- Aspect Ratios: 16:9, 9:16
- Duration: 4s, 8s, or 12s
- Audio generation included

### Sora 2 Image-to-Video

**Endpoint**: `fal-ai/sora-2/image-to-video`

Animate static images into dynamic video clips.

**Features**:

- Resolution: 720p
- Aspect Ratios: 16:9, 9:16, auto
- Duration: 4s, 8s, 12s
- Input: Image URL (up to 8MB)

## Text-to-Video Example

```typescript
import { fal } from '@fal-ai/client';

const result = await fal.subscribe('fal-ai/sora-2/text-to-video', {
  input: {
    prompt: 'A dramatic Hollywood breakup scene at dusk on a quiet suburban street.',
    resolution: '720p',
    aspect_ratio: '16:9',
    duration: '4',
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === 'IN_PROGRESS') {
      update.logs.map((log) => log.message).forEach(console.log);
    }
  },
});

console.log(result.data.video.url);
```

## Image-to-Video Example

```typescript
import { fal } from '@fal-ai/client';

const result = await fal.subscribe('fal-ai/sora-2/image-to-video', {
  input: {
    prompt: 'The woman breathes in and speaks energetically',
    image_url: 'https://example.com/image.png',
    resolution: '720p',
    aspect_ratio: 'auto',
    duration: '4',
  },
});

console.log(result.data.video.url);
```

## Queue API (Recommended for Production)

### Submit Request

```typescript
const { request_id } = await fal.queue.submit('fal-ai/sora-2/text-to-video', {
  input: {
    prompt: 'Your video prompt here',
    duration: '8',
  },
  webhookUrl: 'https://your-app.com/webhook',
});
```

### Check Status

```typescript
const status = await fal.queue.status('fal-ai/sora-2/text-to-video', {
  requestId: request_id,
  logs: true,
});
```

### Get Result

```typescript
const result = await fal.queue.result('fal-ai/sora-2/text-to-video', {
  requestId: request_id,
});
```

## Input Schema (Text-to-Video)

| Parameter      | Type   | Required | Description                           |
| -------------- | ------ | -------- | ------------------------------------- |
| `prompt`       | string | Yes      | Text description of the video         |
| `resolution`   | enum   | No       | "720p" (default)                      |
| `aspect_ratio` | enum   | No       | "16:9" (default), "9:16"              |
| `duration`     | enum   | No       | "4", "8", "12" seconds (default: "4") |
| `api_key`      | string | No       | OpenAI API key (if using own key)     |

## Input Schema (Image-to-Video)

| Parameter      | Type   | Required | Description              |
| -------------- | ------ | -------- | ------------------------ |
| `prompt`       | string | Yes      | How to animate the image |
| `image_url`    | string | Yes      | URL of input image       |
| `resolution`   | enum   | No       | "720p" (default)         |
| `aspect_ratio` | enum   | No       | "auto", "16:9", "9:16"   |
| `duration`     | enum   | No       | "4", "8", "12" seconds   |

## Output Schema

```typescript
{
  video: {
    url: string;
    content_type: "video/mp4";
    file_name?: string;
    file_size?: number;
    width?: number;
    height?: number;
    fps?: number;
    duration?: number;
    num_frames?: number;
  };
  video_id: string;
}
```

## Pricing

- **Cost**: $0.10 per second of generated video
- **Example**: An 8-second video costs $0.80

## Rate Limits

- Check your fal.ai dashboard for current limits
- Use webhooks for async processing
- Implement exponential backoff for polling

## Error Handling

```typescript
try {
  const result = await fal.subscribe('fal-ai/sora-2/text-to-video', {
    input: { prompt: '...' },
  });
} catch (error) {
  console.error('Video generation failed:', error.message);
  // Handle error appropriately
}
```

## Best Practices

1. **Use Queue API**: For production, always use the queue API with webhooks
2. **Detailed Prompts**: Include subject, action, style, lighting, and camera motion
3. **Monitor Status**: Track generation progress via queue status
4. **Handle Errors**: Implement retry logic with exponential backoff
5. **Cost Management**: Be mindful of duration settings (longer = more expensive)

## Notes

- Maximum prompt length: ~2000 characters
- Safety filters applied to content
- Videos include synchronized audio
- MP4 format output
- Default FPS: 24
