# Veo on Vertex AI - Video Generation API

Source: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/veo-video-generation

## Overview

Veo is Google's video generation model that creates videos from text prompts or image prompts. The API supports text-to-video, image-to-video, and advanced features like reference images and video extension.

## Supported Models

- `veo-2.0-generate-001`
- `veo-2.0-generate-exp`
- `veo-2.0-generate-preview`
- `veo-3.0-generate-001`
- `veo-3.0-fast-generate-001`
- `veo-3.1-generate-preview` (Preview)
- `veo-3.1-fast-generate-preview` (Preview)

## HTTP Request

```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
https://LOCATION-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/LOCATION/publishers/google/models/MODEL_ID:predictLongRunning \
-d '{
  "instances": [
    {
      "prompt": "string",
      "image": {
        "bytesBase64Encoded": "string",
        "gcsUri": "string",
        "mimeType": "string"
      }
    }
  ],
  "parameters": {
    "aspectRatio": "string",
    "durationSeconds": integer,
    "generateAudio": boolean,
    "sampleCount": integer
  }
}'
```

## Instance Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `prompt` | `string` | Required for text-to-video. Text string to guide video generation. |
| `image` | Union field | Optional. Image to guide video generation (image-to-video). |
| `lastFrame` | Union field | Optional. Image of last frame to fill space between (Preview models). |
| `video` | Union field | Optional. Veo-generated video to extend in length (Preview models). |
| `mask` | Union field | Optional. Mask image to add/remove objects from video. |
| `referenceImages` | `list[referenceImages]` | Optional. Up to 3 asset images or 1 style image (Preview: veo-2.0-generate-exp, veo-3.1-generate-preview). |
| `referenceImages.image` | Union field | Image for reference (asset or style). |
| `referenceImages.referenceType` | `string` | Required. Type of reference: `"asset"` or `"style"` |
| `bytesBase64Encoded` | `string` | Base64-encoded image or video file. |
| `gcsUri` | `string` | Cloud Storage bucket URI. |
| `mimeType` | `string` | Required. MIME type (`image/jpeg`, `image/png`, `video/mp4`, etc.) |

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `aspectRatio` | `string` | Optional. Aspect ratio (`16:9` or `9:16`). Default: `16:9` |
| `compressionQuality` | `string` | Optional. Compression quality (`optimized` or `lossless`). Default: `optimized` |
| `durationSeconds` | `integer` | Required. Video length in seconds. Veo 2: 5-8, Veo 3: 4, 6, or 8. Default: 8 |
| `enhancePrompt` | `boolean` | Optional. Use Gemini to enhance prompts. Default: `true` |
| `generateAudio` | `boolean` | Required for Veo 3 models. Generate audio for video. |
| `negativePrompt` | `string` | Optional. Description of what to discourage. |
| `personGeneration` | `string` | Optional. People generation setting (`allow_adult` or `dont_allow`). Default: `allow_adult` |
| `resizeMode` | `string` | Optional. Veo 3 image-to-video resize mode (`pad` or `crop`). Default: `pad` |
| `resolution` | `string` | Optional. Veo 3 only. Video resolution (`720p` or `1080p`). Default: `720p` |
| `sampleCount` | `int` | Optional. Number of output videos (1-4). |
| `seed` | `uint32` | Optional. Random seed for deterministic generation (0-4,294,967,295). |
| `storageUri` | `string` | Optional. Cloud Storage bucket URI for output. |

## Text-to-Video Example

### Request

```json
{
  "instances": [
    {
      "prompt": "A fast-tracking shot through a bustling dystopian sprawl with bright neon signs, flying cars and mist, night, lens flare, volumetric lighting"
    }
  ],
  "parameters": {
    "storageUri": "gs://video-bucket/output/",
    "sampleCount": 2,
    "durationSeconds": 8,
    "aspectRatio": "16:9",
    "resolution": "1080p",
    "generateAudio": true
  }
}
```

### Response

```json
{
  "name": "projects/PROJECT_ID/locations/us-central1/publishers/google/models/MODEL_ID/operations/OPERATION_ID"
}
```

## Image-to-Video Example

### Request

```json
{
  "instances": [
    {
      "prompt": "The camera slowly zooms in on the scene",
      "image": {
        "bytesBase64Encoded": "BASE64_ENCODED_IMAGE",
        "mimeType": "image/jpeg"
      }
    }
  ],
  "parameters": {
    "storageUri": "gs://video-bucket/output/",
    "sampleCount": 1,
    "durationSeconds": 8,
    "resizeMode": "pad"
  }
}
```

## Video with Asset Images (Preview)

```json
{
  "instances": [
    {
      "prompt": "A character walking through a futuristic city",
      "referenceImages": [
        {
          "image": {
            "bytesBase64Encoded": "BASE64_ENCODED_IMAGE",
            "mimeType": "image/jpeg"
          },
          "referenceType": "asset"
        }
      ]
    }
  ],
  "parameters": {
    "durationSeconds": 8,
    "storageUri": "gs://video-bucket/output/",
    "sampleCount": 1
  }
}
```

## Polling Long-Running Operation

### Request

```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d @request.json \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/us-central1/publishers/google/models/MODEL_ID:fetchPredictOperation"
```

### Request Body

```json
{
  "operationName": "projects/PROJECT_ID/locations/us-central1/publishers/google/models/MODEL_ID/operations/OPERATION_ID"
}
```

### Response (Complete)

```json
{
  "name": "projects/PROJECT_ID/locations/us-central1/publishers/google/models/MODEL_ID/operations/OPERATION_ID",
  "done": true,
  "response": {
    "raiMediaFilteredCount": 0,
    "@type": "type.googleapis.com/cloud.ai.large_models.vision.GenerateVideoResponse",
    "videos": [
      {
        "gcsUri": "gs://BUCKET_NAME/TIMESTAMPED_FOLDER/sample_0.mp4",
        "mimeType": "video/mp4"
      }
    ]
  }
}
```

## Response Elements

| Element | Description |
|---------|-------------|
| `name` | Full operation name of the long-running operation |
| `done` | Boolean indicating if operation is complete |
| `response` | Response body of the long-running operation |
| `raiMediaFilteredCount` | Count of videos filtered due to responsible AI policies |
| `raiMediaFilteredReasons` | Reasons for filtered videos |
| `videos` | Array of generated videos |
| `gcsUri` | Cloud Storage URI of generated video |
| `bytesBase64Encoded` | Base64-encoded video (if storage URI not provided) |

## Veo 3.1 Features (Preview)

### New Capabilities:
- **Enhanced audio generation**: Richer, more realistic audio
- **Reference images**: Use up to 3 asset images or 1 style image
- **Improved realism**: Better motion, lighting, and detail
- **Last frame control**: Specify ending frame for smoother transitions

### Models:
- `veo-3.1-generate-preview` - Full quality
- `veo-3.1-fast-generate-preview` - Faster generation

## Best Practices

1. **Prompt Engineering**:
   - Be specific about camera movements, lighting, and atmosphere
   - Include technical details (lens flare, volumetric lighting, etc.)
   - Use negative prompts to exclude unwanted elements

2. **Duration Selection**:
   - Veo 3: Choose 4s for quick animations, 8s for full scenes
   - Longer videos may take more time to generate

3. **Audio Generation** (Veo 3):
   - Enable for immersive experience
   - Audio matches video content automatically

4. **Resolution**:
   - Use 720p for faster generation
   - Use 1080p for higher quality output

5. **Reference Images**:
   - Asset images: Define characters, objects, or scenes
   - Style images: Control lighting, colors, and artistic style

## Rate Limits

Check the model-specific documentation for current rate limits:
- Maximum API requests per minute: Varies by model
- Maximum videos per request: 1-4
- Processing time: Varies by duration and complexity

## Integration Example (Node.js)

```typescript
import { GoogleAuth } from 'google-auth-library';

async function generateVideo(prompt: string, projectId: string) {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  const response = await fetch(
    `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/veo-3.1-generate-preview:predictLongRunning`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          durationSeconds: 8,
          aspectRatio: '16:9',
          generateAudio: true,
          sampleCount: 1,
        },
      }),
    }
  );

  return response.json();
}
```

## What's Next

- [Veo video generation overview](https://cloud.google.com/vertex-ai/generative-ai/docs/video/overview)
- [Generate videos using text and image prompts](https://cloud.google.com/vertex-ai/generative-ai/docs/video/generate-videos)
- [Veo 3.1 announcement blog post](https://blog.google/technology/ai/veo-updates-flow/)
