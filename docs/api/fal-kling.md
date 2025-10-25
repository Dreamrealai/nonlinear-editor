# Kling 2.5 Turbo Video Generation API (via fal.ai)

## Overview

Kling 2.5 Turbo Pro is a top-tier text-to-video and image-to-video generation model with unparalleled motion fluidity, cinematic visuals, and exceptional prompt precision.

## Base URL

```
https://fal.ai
```

## Authentication

```bash
export FAL_KEY="YOUR_API_KEY"
```

## Models

### Kling 2.5 Turbo Text-to-Video (Pro)

**Endpoint**: `fal-ai/kling-video/v2.5-turbo/pro/text-to-video`

Generate cinematic video clips from text prompts.

**Features**:

- Duration: 5s or 10s
- Aspect Ratios: 16:9, 9:16, 1:1
- High motion fluidity
- Excellent prompt adherence
- CFG scale control

### Kling 2.5 Turbo Image-to-Video (Pro)

**Endpoint**: `fal-ai/kling-video/v2.5-turbo/pro/image-to-video`

Animate images with realistic motion.

**Features**:

- Duration: 5s or 10s
- CFG scale control
- Negative prompts supported
- First frame from image input

## Text-to-Video Example

```typescript
import { fal } from '@fal-ai/client';

const result = await fal.subscribe('fal-ai/kling-video/v2.5-turbo/pro/text-to-video', {
  input: {
    prompt: 'A noble lord walks among his people with a gentle smile',
    duration: '5',
    aspect_ratio: '16:9',
    negative_prompt: 'blur, distort, and low quality',
    cfg_scale: 0.5,
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

const result = await fal.subscribe('fal-ai/kling-video/v2.5-turbo/pro/image-to-video', {
  input: {
    prompt: 'The character slowly walks forward',
    image_url: 'https://example.com/image.png',
    duration: '5',
    negative_prompt: 'blur, distort, and low quality',
    cfg_scale: 0.5,
  },
});

console.log(result.data.video.url);
```

## Queue API

### Submit Request

```typescript
const { request_id } = await fal.queue.submit('fal-ai/kling-video/v2.5-turbo/pro/text-to-video', {
  input: {
    prompt: 'Your video prompt',
    duration: '10',
  },
  webhookUrl: 'https://your-app.com/webhook',
});
```

### Check Status

```typescript
const status = await fal.queue.status('fal-ai/kling-video/v2.5-turbo/pro/text-to-video', {
  requestId: request_id,
  logs: true,
});
```

### Get Result

```typescript
const result = await fal.queue.result('fal-ai/kling-video/v2.5-turbo/pro/text-to-video', {
  requestId: request_id,
});
```

## Input Schema (Text-to-Video)

| Parameter         | Type   | Required | Description                                                 |
| ----------------- | ------ | -------- | ----------------------------------------------------------- |
| `prompt`          | string | Yes      | Video description                                           |
| `duration`        | enum   | No       | "5" or "10" seconds (default: "5")                          |
| `aspect_ratio`    | enum   | No       | "16:9", "9:16", "1:1" (default: "16:9")                     |
| `negative_prompt` | string | No       | Things to avoid (default: "blur, distort, and low quality") |
| `cfg_scale`       | float  | No       | CFG scale 0-1 (default: 0.5)                                |

## Input Schema (Image-to-Video)

| Parameter         | Type   | Required | Description                        |
| ----------------- | ------ | -------- | ---------------------------------- |
| `prompt`          | string | Yes      | Animation description              |
| `image_url`       | string | Yes      | URL of input image                 |
| `duration`        | enum   | No       | "5" or "10" seconds (default: "5") |
| `negative_prompt` | string | No       | Things to avoid                    |
| `cfg_scale`       | float  | No       | CFG scale 0-1 (default: 0.5)       |

## Output Schema

```typescript
{
  video: {
    url: string;
    content_type?: string;
    file_name?: string;
    file_size?: number;
  }
}
```

## Advanced Features

### Camera Control (V1 Models)

For Kling 1.x models, you can specify camera movements:

```typescript
{
  prompt: "...",
  camera_control: "forward_up", // or "down_back", "right_turn_forward", etc.
}
```

### Advanced Camera Control

```typescript
{
  advanced_camera_control: {
    movement_type: "zoom",  // horizontal, vertical, pan, tilt, roll, zoom
    movement_value: 5
  }
}
```

## Pricing

- **5 second video**: ~$0.15
- **10 second video**: ~$0.30
- Pro tier offers higher quality than standard

## Rate Limits

- Check fal.ai dashboard for limits
- Use webhooks for production workloads

## Error Handling

```typescript
try {
  const result = await fal.subscribe('fal-ai/kling-video/v2.5-turbo/pro/text-to-video', {
    input: { prompt: '...' },
  });
} catch (error) {
  console.error('Generation failed:', error.message);
}
```

## Best Practices

1. **Detailed Prompts**: Describe subject, action, atmosphere, and style
2. **Negative Prompts**: Use to avoid unwanted artifacts
3. **CFG Scale**:
   - Lower (0.3-0.5): More creative, varied results
   - Higher (0.6-1.0): Stricter prompt adherence
4. **Duration**: Start with 5s for faster iteration
5. **Queue API**: Always use for production

## Prompt Tips

Good prompt structure:

```
[Subject] [Action] [Environment] [Style] [Lighting] [Camera]
```

Example:

```
A warrior in armor walking through a misty forest,
cinematic lighting, dramatic atmosphere,
slow tracking shot, high quality
```

## Notes

- Supports 1:1 aspect ratio (unique among video models)
- Excellent for character animation
- Strong physics understanding
- CFG scale is crucial for quality control
- Turbo version faster than standard Kling 2.0
