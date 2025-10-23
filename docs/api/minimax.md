# MiniMax Video Generation API

## Overview
MiniMax provides advanced video generation capabilities through their Hailuo AI platform, supporting both text-to-video and image-to-video generation.

## Base URL
```
https://api.minimax.io
```

## Authentication
Include your API key in the `Authorization` header:
```
Authorization: Bearer YOUR_API_KEY
```

## Models

### MiniMax-Hailuo-02
- **Type**: Text-to-video, Image-to-video
- **Resolution**: 1080P (1920x1088)
- **Max Duration**: 10 seconds
- **Features**: High-quality video generation with advanced prompt understanding

### T2V-01-Director
- **Type**: Text-to-video
- **Features**: Professional-grade text-to-video generation

### I2V-01-Director
- **Type**: Image-to-video
- **Features**: Professional-grade image-to-video generation

## Endpoint: Video Generation

### POST /v1/video_generation

Generate a video from text prompt or image.

#### Request Body

```json
{
  "model": "MiniMax-Hailuo-02",
  "prompt": "A serene lake surrounded by mountains at sunset",
  "first_frame_image": "base64_encoded_image_string (optional)",
  "prompt_optimizer": true
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model` | string | Yes | Model to use for generation |
| `prompt` | string | Yes | Text description of the video to generate |
| `first_frame_image` | string | No | Base64 encoded image for image-to-video generation |
| `prompt_optimizer` | boolean | No | Enable prompt optimization (default: true) |

#### Response

```json
{
  "task_id": "string",
  "status": "processing",
  "base_resp": {
    "status_code": 0,
    "status_msg": "success"
  }
}
```

## Endpoint: Check Task Status

### GET /v1/query/video_generation

Check the status of a video generation task.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_id` | string | Yes | Task ID from generation request |

#### Response

```json
{
  "task_id": "string",
  "status": "Success",
  "file_id": "string",
  "download_url": "https://...",
  "base_resp": {
    "status_code": 0,
    "status_msg": "success"
  }
}
```

#### Status Values
- `Queueing`: Task is waiting in queue
- `Processing`: Video is being generated
- `Success`: Video generation completed
- `Failed`: Generation failed

## Text-to-Video Example

```typescript
const response = await fetch('https://api.minimax.io/v1/video_generation', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'MiniMax-Hailuo-02',
    prompt: 'A serene lake surrounded by mountains at sunset',
    prompt_optimizer: true
  })
});

const { task_id } = await response.json();
```

## Image-to-Video Example

```typescript
const response = await fetch('https://api.minimax.io/v1/video_generation', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'MiniMax-Hailuo-02',
    prompt: 'The scene comes to life with gentle movement',
    first_frame_image: base64Image,
    prompt_optimizer: true
  })
});

const { task_id } = await response.json();
```

## Rate Limits
- Check your MiniMax dashboard for current rate limits
- Recommended: Implement exponential backoff for polling

## Error Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1001 | Invalid API key |
| 1002 | Insufficient credits |
| 1003 | Invalid parameters |
| 2001 | Task not found |
| 2002 | Task expired |

## Notes
- Maximum prompt length: 2000 characters
- Supported image formats for I2V: JPEG, PNG
- Maximum image size: 10MB
- Video output format: MP4
- Default FPS: 24
