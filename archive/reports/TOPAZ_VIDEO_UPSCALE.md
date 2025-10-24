# Topaz Video Upscale Integration

## Overview

This document describes the integration of fal.ai's Topaz Video Upscale API into the non-linear video editor. Topaz Video Upscale provides professional-grade video upscaling using Topaz technology, powered by Proteus v4 for upscaling and Apollo v8 for frame interpolation.

## API Details

- **Endpoint**: `fal-ai/topaz/upscale/video`
- **Model URL**: https://fal.ai/models/fal-ai/topaz/upscale/video
- **API Documentation**: https://fal.ai/models/fal-ai/topaz/upscale/video/api
- **Pricing**: $0.1 per second of video
- **Type**: Inference API (Commercial use, Partner)

## Features

- **Professional-grade upscaling**: Uses Topaz Proteus v4 technology
- **Up to 8x upscaling**: Can upscale videos by factors up to 8x
- **Frame interpolation**: Optionally uses Apollo v8 for smooth frame interpolation
- **High FPS output**: Supports up to 120 FPS output
- **H.264/H.265 support**: Choose between H264 or H265 codec for output

## Installation

Install the fal.ai client:

```bash
npm install --save @fal-ai/client
```

## Authentication

Set your FAL API key as an environment variable:

```bash
export FAL_KEY="YOUR_API_KEY"
```

Or configure it programmatically:

```javascript
import { fal } from '@fal-ai/client';

fal.config({
  credentials: 'YOUR_FAL_KEY',
});
```

**Important**: When running on the client-side, use a server-side proxy to protect your API key.

## API Usage

### Input Schema

| Parameter        | Type    | Required | Default | Description                                                                      |
| ---------------- | ------- | -------- | ------- | -------------------------------------------------------------------------------- |
| `video_url`      | string  | Yes      | -       | URL of the video to upscale                                                      |
| `upscale_factor` | float   | No       | 2       | Factor to upscale the video by (e.g., 2.0 doubles width and height)              |
| `target_fps`     | integer | No       | -       | Target FPS for frame interpolation. If set, frame interpolation will be enabled. |
| `H264_output`    | boolean | No       | false   | Whether to use H264 codec for output video. Default is H265.                     |

### Output Schema

| Field   | Type | Description                      |
| ------- | ---- | -------------------------------- |
| `video` | File | The upscaled video file with URL |

### Example: Basic Usage (Subscribe API)

```javascript
import { fal } from '@fal-ai/client';

const result = await fal.subscribe('fal-ai/topaz/upscale/video', {
  input: {
    video_url: 'https://example.com/input-video.mp4',
    upscale_factor: 2,
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === 'IN_PROGRESS') {
      update.logs.map((log) => log.message).forEach(console.log);
    }
  },
});

console.log(result.data);
// Output: { video: { url: "https://v3.fal.media/files/..." } }
console.log(result.requestId);
```

### Example: Queue-based Processing

For long-running requests, use the queue API:

```javascript
import { fal } from '@fal-ai/client';

// Submit request
const { request_id } = await fal.queue.submit('fal-ai/topaz/upscale/video', {
  input: {
    video_url: 'https://example.com/input-video.mp4',
    upscale_factor: 2,
    target_fps: 60, // Enable frame interpolation
  },
  webhookUrl: 'https://optional.webhook.url/for/results',
});

// Check status
const status = await fal.queue.status('fal-ai/topaz/upscale/video', {
  requestId: request_id,
  logs: true,
});

// Get result when completed
const result = await fal.queue.result('fal-ai/topaz/upscale/video', {
  requestId: request_id,
});

console.log(result.data.video.url);
```

### Example: With Frame Interpolation

```javascript
const result = await fal.subscribe('fal-ai/topaz/upscale/video', {
  input: {
    video_url: 'https://example.com/input-video.mp4',
    upscale_factor: 2,
    target_fps: 120, // Enable frame interpolation to 120 FPS
  },
  logs: true,
});
```

## File Handling

The API accepts video URLs in several formats:

1. **Hosted files (URL)**: Provide a publicly accessible URL
2. **Base64 Data URI**: Pass a Base64 data URI (less performant for large files)
3. **Uploaded files**: Use fal.ai's storage service

### Uploading Files

```javascript
import { fal } from '@fal-ai/client';

// The client will auto-upload File or Blob objects
const file = new File([videoData], 'video.mp4', { type: 'video/mp4' });
const url = await fal.storage.upload(file);

// Use the uploaded URL in your request
const result = await fal.subscribe('fal-ai/topaz/upscale/video', {
  input: {
    video_url: url,
    upscale_factor: 2,
  },
});
```

## Additional Request Types

The Topaz Video Upscale API defines several specialized request types for different use cases. Note that these may be available through different endpoints or as extended parameters:

### SlowMotionRequest

For creating slow-motion effects:

| Parameter         | Type    | Required | Default | Description                                                |
| ----------------- | ------- | -------- | ------- | ---------------------------------------------------------- |
| `video_url`       | string  | Yes      | -       | URL of the video to apply slow motion to                   |
| `slowdown_factor` | integer | No       | 4       | Factor to slow down the video by (e.g., 4 means 4x slower) |
| `upscale_factor`  | float   | No       | -       | Optional factor to upscale the video                       |

### StrongAIUpscaleRequest

For AI-generated videos requiring heavy upscaling:

| Parameter       | Type    | Required | Default | Description                              |
| --------------- | ------- | -------- | ------- | ---------------------------------------- |
| `video_url`     | string  | Yes      | -       | URL of the AI-generated video to upscale |
| `target_width`  | integer | No       | 5120    | Target width of the output video         |
| `target_height` | integer | No       | 2880    | Target height of the output video        |
| `target_fps`    | integer | No       | -       | Target FPS for the output video          |

### RecoverUpscaleRequest

For low-quality videos that need recovery and upscaling:

| Parameter        | Type    | Required | Default | Description                                         |
| ---------------- | ------- | -------- | ------- | --------------------------------------------------- |
| `video_url`      | string  | Yes      | -       | URL of the low-quality video to upscale and recover |
| `upscale_factor` | float   | No       | 2       | Factor to upscale the video by                      |
| `target_fps`     | integer | No       | -       | Target FPS for the output video                     |

**Note**: These specialized request types are documented in the API schema but may require specific endpoint usage. Consult the [OpenAPI Schema](https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=fal-ai/topaz/upscale/video) for the most current parameter support.

## Integration Architecture

### Backend Integration (Recommended)

For security, implement a server-side endpoint that proxies requests to fal.ai:

```javascript
// Example Netlify Function
export async function handler(event) {
  const { video_url, upscale_factor, target_fps } = JSON.parse(event.body);

  const result = await fal.subscribe('fal-ai/topaz/upscale/video', {
    input: {
      video_url,
      upscale_factor,
      target_fps,
    },
  });

  return {
    statusCode: 200,
    body: JSON.stringify(result.data),
  };
}
```

### Frontend Integration

Create a UI component for video upscaling:

```javascript
// Example React component
async function handleUpscaleVideo(videoUrl, upscaleFactor = 2, targetFps = null) {
  try {
    const response = await fetch('/api/upscale-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_url: videoUrl,
        upscale_factor: upscaleFactor,
        target_fps: targetFps,
      }),
    });

    const result = await response.json();
    return result.video.url;
  } catch (error) {
    console.error('Video upscale failed:', error);
    throw error;
  }
}
```

## Error Handling

Implement proper error handling for various scenarios:

```javascript
try {
  const result = await fal.subscribe('fal-ai/topaz/upscale/video', {
    input: { video_url, upscale_factor },
    logs: true,
  });

  return result.data.video.url;
} catch (error) {
  if (error.status === 401) {
    console.error('Authentication failed - check API key');
  } else if (error.status === 429) {
    console.error('Rate limit exceeded');
  } else if (error.status >= 500) {
    console.error('Server error - try again later');
  } else {
    console.error('Upscale failed:', error.message);
  }
  throw error;
}
```

## Best Practices

1. **Use Queue API for long videos**: Videos longer than 30 seconds should use the queue API
2. **Implement webhooks**: For production, use webhooks to handle completion events
3. **Validate input videos**: Check video format and size before submitting
4. **Monitor costs**: Track usage as pricing is per second of video ($0.1/sec)
5. **Use appropriate upscale factors**: Higher factors increase processing time and cost
6. **Enable frame interpolation selectively**: Only use when smooth motion is needed
7. **Protect API keys**: Always use server-side proxies in production

## Testing

Test the integration with a sample video:

```javascript
const testVideoUrl =
  'https://v3.fal.media/files/kangaroo/y5-1YTGpun17eSeggZMzX_video-1733468228.mp4';

const result = await fal.subscribe('fal-ai/topaz/upscale/video', {
  input: {
    video_url: testVideoUrl,
    upscale_factor: 2,
  },
  logs: true,
});

console.log('Upscaled video URL:', result.data.video.url);
```

## References

- [fal.ai Topaz Video Upscale Model](https://fal.ai/models/fal-ai/topaz/upscale/video)
- [fal.ai API Documentation](https://fal.ai/models/fal-ai/topaz/upscale/video/api)
- [fal.ai Main Documentation](https://docs.fal.ai/)
- [fal.ai JavaScript Client Guide](https://docs.fal.ai/clients/javascript)
- [Server-side Integration Guide](https://docs.fal.ai/model-endpoints/server-side)
- [OpenAPI Schema](https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=fal-ai/topaz/upscale/video)

## License and Terms

This integration uses the fal.ai Topaz Video Upscale service. Please review:

- [fal.ai Terms of Service](https://fal.ai/terms)
- Commercial use is allowed under fal.ai's partner agreement
- Pricing is subject to change - see current rates at https://fal.ai/pricing
