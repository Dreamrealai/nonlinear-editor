# Image generation API - Imagen on Vertex AI

Source: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/imagen-api

## Overview

The Imagen API lets you generate high quality images in seconds, using text prompt to guide the generation. You can also upscale images using Imagen API.

## Supported Models

Imagen API supports the following models:

- `imagen-4.0-generate-001`
- `imagen-4.0-fast-generate-001`
- `imagen-4.0-ultra-generate-001`
- `imagen-3.0-generate-002`
- `imagen-3.0-generate-001`
- `imagen-3.0-fast-generate-001`
- `imagen-3.0-capability-001`
- `imagegeneration@006`
- `imagegeneration@005`
- `imagegeneration@002`

## API Syntax

### REST Endpoint

```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
https://LOCATION-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/LOCATION/publishers/google/models/MODEL_VERSION:predict \
-d '{
  "instances": [
    {
      "prompt": "..."
    }
  ],
  "parameters": {
    "sampleCount": ...
  }
}'
```

### Python SDK

```python
from vertexai.preview.vision_models import ImageGenerationModel

generation_model = ImageGenerationModel.from_pretrained("MODEL_VERSION")

response = generation_model.generate_images(
    prompt="...",
    negative_prompt="...",
    aspect_ratio=...,
)
response.images[0].show()
```

## Generate Images Parameters

| Parameter          | Type            | Description                                                                                                      |
| ------------------ | --------------- | ---------------------------------------------------------------------------------------------------------------- |
| `prompt`           | `string`        | Required. The text prompt for the image.                                                                         |
| `addWatermark`     | `bool`          | Optional. Add an invisible watermark to generated images. Default: `true`                                        |
| `aspectRatio`      | `string`        | Optional. Aspect ratio for generated images. Default: "1:1"                                                      |
| `enhancePrompt`    | `boolean`       | Optional. Use LLM-based prompt rewriting for higher quality.                                                     |
| `language`         | `string`        | Optional. Language of text prompt (`auto`, `en`, `zh`, `hi`, `ja`, `ko`, `pt`, `es`)                             |
| `negativePrompt`   | `string`        | Optional. Description of what to discourage. Not supported by `imagen-3.0-generate-002` and newer.               |
| `outputOptions`    | `outputOptions` | Optional. Output image format options.                                                                           |
| `personGeneration` | `string`        | Optional. Allow generation of people (`dont_allow`, `allow_adult`, `allow_all`). Default: `allow_adult`          |
| `safetySetting`    | `string`        | Optional. Safety filter level (`block_low_and_above`, `block_medium_and_above`, `block_only_high`, `block_none`) |
| `sampleCount`      | `int`           | Required. Number of images to generate. Default: 4                                                               |
| `sampleImageSize`  | `string`        | Optional. Output resolution (`1K` or `2K`). Default: `1K`                                                        |
| `seed`             | `Uint32`        | Optional. Random seed for deterministic generation. Not available when `addWatermark` is `true`.                 |
| `storageUri`       | `string`        | Optional. Cloud Storage URI to store generated images.                                                           |

## Output Options

| Parameter                          | Type     | Description                                                                |
| ---------------------------------- | -------- | -------------------------------------------------------------------------- |
| `outputOptions.mimeType`           | `string` | Optional. Image format (`image/png` or `image/jpeg`). Default: `image/png` |
| `outputOptions.compressionQuality` | `int`    | Optional. Compression quality for JPEG (0-100). Default: 75                |

## Example Request

```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d @request.json \
  "https://LOCATION-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/LOCATION/publishers/google/models/MODEL_VERSION:predict"
```

### Request Body (request.json)

```json
{
  "instances": [
    {
      "prompt": "TEXT_PROMPT"
    }
  ],
  "parameters": {
    "sampleCount": IMAGE_COUNT,
    "addWatermark": true,
    "aspectRatio": "16:9",
    "enhancePrompt": true,
    "outputOptions": {
      "mimeType": "image/png",
      "compressionQuality": 75
    },
    "personGeneration": "allow_adult",
    "safetySetting": "block_medium_and_above",
    "seed": 12345,
    "storageUri": "gs://bucket-name/output/"
  }
}
```

## Response Format

```json
{
  "predictions": [
    {
      "bytesBase64Encoded": "BASE64_IMG_BYTES",
      "mimeType": "image/png"
    },
    {
      "mimeType": "image/png",
      "bytesBase64Encoded": "BASE64_IMG_BYTES"
    }
  ]
}
```

## Upscale Images

### Parameters

| Parameter                     | Type            | Description                             |
| ----------------------------- | --------------- | --------------------------------------- |
| `mode`                        | `string`        | Required. Must be set to `"upscale"`    |
| `upscaleConfig`               | `UpscaleConfig` | Required. Configuration for upscaling   |
| `upscaleConfig.upscaleFactor` | `string`        | Required. Upscale factor (`x2` or `x4`) |
| `outputOptions`               | `OutputOptions` | Optional. Output image format options   |
| `storageUri`                  | `string`        | Optional. Cloud Storage URI for output  |

## Python Example

```python
import vertexai
from vertexai.preview.vision_models import ImageGenerationModel

# Initialize Vertex AI
vertexai.init(project=PROJECT_ID, location="us-central1")

# Load model
model = ImageGenerationModel.from_pretrained("imagen-3.0-generate-002")

# Generate images
images = model.generate_images(
    prompt="A futuristic city at sunset",
    number_of_images=1,
    language="en",
    aspect_ratio="1:1",
    safety_filter_level="block_some",
    person_generation="allow_adult",
)

# Save image
images[0].save(location="output-image.png", include_generation_parameters=False)
```

## Best Practices

1. **Prompt Engineering**: Be specific and detailed in prompts
2. **Safety Filters**: Use appropriate safety settings for your use case
3. **Watermarking**: Keep watermarks enabled for production unless deterministic output is required
4. **Aspect Ratios**: Choose appropriate aspect ratios for your content:
   - `1:1` - Square (social media)
   - `3:4` - Ads, social media
   - `4:3` - TV, photography
   - `16:9` - Landscape
   - `9:16` - Portrait

## Rate Limits

Check current rate limits in the Google Cloud Console or refer to the [Generative AI on Vertex AI documentation](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/locations-genai).

## What's Next

- [Imagen on Vertex AI overview](https://cloud.google.com/vertex-ai/generative-ai/docs/image/overview)
- [Generate images using text prompts](https://cloud.google.com/vertex-ai/generative-ai/docs/image/generate-images)
