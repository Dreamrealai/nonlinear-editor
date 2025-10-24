# Google Vertex AI Imagen - Complete API Documentation

**Comprehensive guide for Imagen 3, Imagen 4, and Imagen 4 Ultra**

**Last Updated:** October 10, 2025
**API Version:** Vertex AI v1

---

## Table of Contents

1. [Overview](#overview)
2. [Available Models](#available-models)
3. [Quick Start](#quick-start)
4. [Authentication & Setup](#authentication--setup)
5. [API Reference](#api-reference)
6. [Request Parameters](#request-parameters)
7. [Response Format](#response-format)
8. [Code Examples](#code-examples)
9. [Pricing](#pricing)
10. [Rate Limits & Quotas](#rate-limits--quotas)
11. [Prompt Engineering](#prompt-engineering)
12. [Best Practices](#best-practices)
13. [Limitations](#limitations)
14. [Error Handling](#error-handling)
15. [Resources](#resources)

---

## Overview

**Imagen** is Google's state-of-the-art image generation AI that transforms text prompts into high-quality visual assets in seconds. Available through Google Cloud Vertex AI, Imagen offers multiple model variants optimized for different use cases: standard generation, ultra-quality, fast generation, and editing/customization.

### Key Features

- **Text-to-Image Generation**: Create images from descriptive text prompts
- **Multiple Quality Tiers**: Standard, Ultra, and Fast variants
- **High Resolution**: Support for 1K and 2K outputs (Imagen 4)
- **10 Aspect Ratios**: From square to ultra-wide cinematic
- **Deterministic Generation**: Seed-based reproducibility
- **SynthID Watermarking**: Digital provenance for AI-generated content
- **Image Editing**: Mask-based editing and customization (Imagen 3 Capability)
- **Multi-language Support**: English (full), plus 6 languages in preview

---

## Available Models

### Imagen 4 Family (Released May 2025)

#### imagen-4.0-generate-001 (Standard)

- **Price**: $0.04 per image
- **Resolution**: 1K, 2K
- **Best For**: Balanced quality and speed
- **Generation Time**: ~5.8 seconds average
- **Status**: Generally Available

#### imagen-4.0-ultra-generate-001 (Ultra)

- **Price**: $0.06 per image
- **Resolution**: 1K, 2K
- **Best For**: Highest quality, photorealistic images
- **Features**: Hyper-fine detail rendering, superior text rendering
- **Generation Time**: ~5.8 seconds average
- **Status**: Generally Available

#### imagen-4.0-fast-generate-001 (Fast)

- **Price**: $0.04 per image
- **Resolution**: 1K, 2K
- **Best For**: Ultra-fast generation (up to 10x faster)
- **Generation Time**: <1 second
- **Use Cases**: Rapid prototyping, batch processing, high-volume
- **Status**: Generally Available

### Imagen 3 Family

#### imagen-3.0-generate-002 (Standard)

- **Price**: $0.04 per image
- **Resolution**: 1K only
- **Rate Limit**: 20 requests per minute per project
- **Last Updated**: February 2025
- **Status**: Generally Available

#### imagen-3.0-fast-generate-001 (Fast)

- **Price**: $0.02 per image
- **Resolution**: 1K only
- **Best For**: Low-latency generation at lowest cost
- **Status**: Generally Available

#### imagen-3.0-capability-001 (Editing & Customization)

- **Price**: $0.04 per image
- **Resolution**: 1K only
- **Rate Limit**: 100 requests per minute per project
- **Features**: Image editing, mask-based editing, customization
- **Supported**: Subject/style customization, object insertion/removal, outpainting
- **Not Supported**: Standard generation, upscaling
- **Status**: Generally Available

### Legacy Models (Deprecated)

| Model ID              | Deprecation Date | Removal Date       | Action Required       |
| --------------------- | ---------------- | ------------------ | --------------------- |
| `imagegeneration@002` | June 24, 2025    | September 24, 2025 | Migrate to Imagen 3/4 |
| `imagegeneration@005` | June 24, 2025    | September 24, 2025 | Migrate to Imagen 3/4 |
| `imagegeneration@006` | June 24, 2025    | September 24, 2025 | Migrate to Imagen 3/4 |

---

## Quick Start

### Prerequisites

1. Google Cloud Project with billing enabled
2. Vertex AI API enabled
3. IAM role: `roles/aiplatform.user`
4. Authentication configured (gcloud CLI or service account)

### Minimal Example (cURL)

```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  https://us-central1-aiplatform.googleapis.com/v1/projects/YOUR_PROJECT_ID/locations/us-central1/publishers/google/models/imagen-4.0-generate-001:predict \
  -d '{
    "instances": [{
      "prompt": "A serene mountain lake at sunrise with mist"
    }],
    "parameters": {
      "sampleCount": 1,
      "aspectRatio": "16:9"
    }
  }'
```

---

## Authentication & Setup

### Step 1: Enable Vertex AI API

```bash
gcloud services enable aiplatform.googleapis.com
```

### Step 2: Authenticate

#### Option 1: User Credentials (Development)

```bash
gcloud auth application-default login
```

#### Option 2: Service Account (Production)

```bash
gcloud auth activate-service-account --key-file=path/to/key.json
```

#### Option 3: Service Account Impersonation (Local Development)

```bash
gcloud auth application-default login --impersonate-service-account=SERVICE_ACCT_EMAIL
```

### Step 3: Set Environment Variables

```bash
export GOOGLE_CLOUD_PROJECT=your-project-id
export GOOGLE_CLOUD_LOCATION=us-central1
export GOOGLE_GENAI_USE_VERTEXAI=True
```

### Required IAM Roles

- **Vertex AI User** (`roles/aiplatform.user`): Sufficient for most users
- **Vertex AI Administrator** (`roles/aiplatform.admin`): Full control

---

## API Reference

### Endpoint Format

```
POST https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models/{MODEL_ID}:predict
```

### Supported Regions

- `us-central1` (US - Iowa)
- `europe-west2` (London)
- `asia-northeast3` (Tokyo)
- Plus additional regions for higher availability

### HTTP Headers

```
Authorization: Bearer $(gcloud auth print-access-token)
Content-Type: application/json; charset=utf-8
```

---

## Request Parameters

### Required Parameters

| Parameter | Type   | Description                                            |
| --------- | ------ | ------------------------------------------------------ |
| `prompt`  | string | Text description for image generation (max 480 tokens) |

### Optional Parameters

| Parameter                 | Type    | Default                  | Values                      | Description                                  |
| ------------------------- | ------- | ------------------------ | --------------------------- | -------------------------------------------- |
| `sampleCount`             | integer | 4                        | 1-4                         | Number of images to generate                 |
| `aspectRatio`             | string  | "1:1"                    | See table below             | Image aspect ratio                           |
| `sampleImageSize`         | string  | "1K"                     | "1K", "2K"                  | Output resolution (Imagen 4 only)            |
| `seed`                    | integer | -                        | 1-2,147,483,647             | For deterministic generation                 |
| `addWatermark`            | boolean | true                     | true/false                  | Add SynthID digital watermark                |
| `enhancePrompt`           | boolean | false                    | true/false                  | Use AI prompt enhancement                    |
| `language`                | string  | "en"                     | See table below             | Prompt language                              |
| `safetySetting`           | string  | "block_medium_and_above" | See Safety section          | Content filtering level                      |
| `personGeneration`        | string  | "allow_adult"            | "allow_adult", "dont_allow" | Control people/face generation               |
| `includeRaiReason`        | boolean | false                    | true/false                  | Return RAI filter reason codes               |
| `includeSafetyAttributes` | boolean | false                    | true/false                  | Return safety attribute scores               |
| `storageUri`              | string  | -                        | gs://bucket/path/           | Cloud Storage location for output            |
| `compressionQuality`      | integer | 75                       | 0-100                       | JPEG compression quality                     |
| `negativePrompt`          | string  | -                        | -                           | Elements to avoid (Imagen 3 Capability only) |

### Aspect Ratios and Resolutions

| Ratio    | Use Cases                       | 1K Resolution | 2K Resolution (Imagen 4) |
| -------- | ------------------------------- | ------------- | ------------------------ |
| **1:1**  | Social media, profile images    | 1024x1024     | 2048x2048                |
| **3:4**  | TV, media, portraits            | 896x1280      | 1792x2560                |
| **4:3**  | TV, photography                 | 1280x896      | 2560x1792                |
| **9:16** | Mobile, Stories, vertical video | 768x1408      | 1536x2816                |
| **16:9** | Landscape, widescreen           | 1408x768      | 2816x1536                |
| **2:3**  | Vertical standard               | 896x1344      | 1792x2688                |
| **3:2**  | DSLR standard                   | 1344x896      | 2688x1792                |
| **4:5**  | Nearly square portrait          | 1024x1280     | 2048x2560                |
| **5:4**  | Nearly square landscape         | 1280x1024     | 2560x2048                |
| **21:9** | Ultra-wide cinematic            | 1536x640      | 3072x1280                |

### Supported Languages

| Language   | Code | Status          | Description             |
| ---------- | ---- | --------------- | ----------------------- |
| English    | `en` | ✅ Full Support | Complete feature access |
| Chinese    | `zh` | ⚠️ Preview      | Beta support            |
| Hindi      | `hi` | ⚠️ Preview      | Beta support            |
| Japanese   | `ja` | ⚠️ Preview      | Beta support            |
| Korean     | `ko` | ⚠️ Preview      | Beta support            |
| Portuguese | `pt` | ⚠️ Preview      | Beta support            |
| Spanish    | `es` | ⚠️ Preview      | Beta support            |

---

## Response Format

### Successful Response

```json
{
  "predictions": [
    {
      "mimeType": "image/png",
      "bytesBase64Encoded": "iVBORw0KGgoAAAANSUhEUgAA..."
    },
    {
      "mimeType": "image/png",
      "bytesBase64Encoded": "iVBORw0KGgoAAAANSUhEUgAA..."
    }
  ]
}
```

### Response Fields

| Field                | Type   | Description                                          |
| -------------------- | ------ | ---------------------------------------------------- |
| `predictions`        | array  | Array of generated image objects                     |
| `mimeType`           | string | Image format (typically "image/png" or "image/jpeg") |
| `bytesBase64Encoded` | string | Base64-encoded image data                            |

---

## Code Examples

### Python (Google Gen AI SDK) - Recommended

```python
from google import genai
from google.genai.types import GenerateImagesConfig

# Initialize client (requires environment variables set)
client = genai.Client()

# Generate image with Imagen 4 Ultra
response = client.models.generate_images(
    model="imagen-4.0-ultra-generate-001",
    prompt="A futuristic cityscape at sunset with flying cars and neon lights, cyberpunk style, volumetric lighting, 8K detail",
    config=GenerateImagesConfig(
        image_size="2K",
    ),
)

# Save the generated image
output_file = "output-image.png"
response.generated_images[0].image.save(output_file)
print(f"Image saved to {output_file}")
print(f"Image size: {len(response.generated_images[0].image.image_bytes)} bytes")
```

### Python with Multiple Images and Parameters

```python
from google import genai
from google.genai.types import GenerateImagesConfig

client = genai.Client()

response = client.models.generate_images(
    model="imagen-4.0-generate-001",
    prompt="Macro photograph of a dewdrop on a spider web at sunrise, bokeh background, golden hour lighting, extreme close-up",
    config=GenerateImagesConfig(
        number_of_images=4,
        aspect_ratio="16:9",
        image_size="2K",
        add_watermark=True,
        safety_filter_level="block_medium_and_above",
        person_generation="allow_adult",
        language="en"
    ),
)

# Save all generated images
for i, generated_image in enumerate(response.generated_images):
    filename = f"output_{i}.png"
    generated_image.image.save(filename)
    print(f"Saved {filename}")
```

### Python with Deterministic Generation

```python
from google import genai
from google.genai.types import GenerateImagesConfig

client = genai.Client()

# Generate reproducible images using seed
response = client.models.generate_images(
    model="imagen-4.0-generate-001",
    prompt="A serene Japanese garden with cherry blossoms and a wooden bridge",
    config=GenerateImagesConfig(
        seed=42,
        add_watermark=False,  # Required for seed to work
        image_size="2K"
    ),
)

response.generated_images[0].image.save("deterministic-output.png")
```

### Node.js/TypeScript (REST API)

```typescript
import https from 'https';
import { GoogleAuth } from 'google-auth-library';
import * as fs from 'fs';

interface ImageGenerationRequest {
  instances: Array<{ prompt: string }>;
  parameters: {
    sampleCount?: number;
    aspectRatio?: string;
    sampleImageSize?: string;
    addWatermark?: boolean;
    safetySetting?: string;
  };
}

async function generateImage(): Promise<void> {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  if (!accessToken.token) {
    throw new Error('Failed to get access token');
  }

  const projectId = 'your-project-id';
  const location = 'us-central1';
  const modelVersion = 'imagen-4.0-generate-001';

  const requestBody: ImageGenerationRequest = {
    instances: [{ prompt: 'A cyberpunk cat wearing VR goggles in a neon-lit alley' }],
    parameters: {
      sampleCount: 2,
      aspectRatio: '16:9',
      sampleImageSize: '2K',
      addWatermark: true,
      safetySetting: 'block_medium_and_above',
    },
  };

  const options = {
    hostname: `${location}-aiplatform.googleapis.com`,
    path: `/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelVersion}:predict`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken.token}`,
      'Content-Type': 'application/json',
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          response.predictions.forEach((prediction: any, index: number) => {
            const imageBuffer = Buffer.from(prediction.bytesBase64Encoded, 'base64');
            const filename = `output_image_${index}.png`;
            fs.writeFileSync(filename, imageBuffer);
            console.log(`Saved ${filename} (${imageBuffer.length} bytes)`);
          });

          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(JSON.stringify(requestBody));
    req.end();
  });
}

generateImage()
  .then(() => console.log('Image generation complete'))
  .catch((error) => console.error('Error:', error));
```

### cURL

```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "instances": [{
      "prompt": "A majestic dragon soaring over a medieval castle at golden hour, fantasy art style, intricate details, dramatic lighting"
    }],
    "parameters": {
      "sampleCount": 4,
      "aspectRatio": "16:9",
      "sampleImageSize": "2K",
      "addWatermark": true,
      "safetySetting": "block_medium_and_above",
      "personGeneration": "allow_adult"
    }
  }' \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/YOUR_PROJECT_ID/locations/us-central1/publishers/google/models/imagen-4.0-generate-001:predict"
```

---

## Pricing

### Imagen 4 Pricing (2025)

| Model                             | Price per Image | Resolution | Best For                        |
| --------------------------------- | --------------- | ---------- | ------------------------------- |
| **imagen-4.0-ultra-generate-001** | $0.06           | Up to 2K   | Highest quality, photorealistic |
| **imagen-4.0-generate-001**       | $0.04           | Up to 2K   | Balanced quality and cost       |
| **imagen-4.0-fast-generate-001**  | $0.04           | Up to 2K   | Speed-optimized generation      |

### Imagen 3 Pricing

| Model                            | Price per Image | Resolution |
| -------------------------------- | --------------- | ---------- |
| **imagen-3.0-generate-002**      | $0.04           | 1K only    |
| **imagen-3.0-fast-generate-001** | $0.02           | 1K only    |
| **imagen-3.0-capability-001**    | $0.04           | 1K only    |

### Alternative Pricing (Gemini Developer API)

- **Imagen 4**: $30 per 1,000,000 tokens
- Output images up to 1024x1024px = 1,290 tokens
- **Equivalent**: ~$0.039 per image

### Google AI Studio

- **Free Tier**: ~50 images/day
- **Paid Tier**: $0.03 per image (Imagen 3)

### Cost Optimization Tips

1. Use **Imagen 3 Fast** for lowest cost ($0.02/image)
2. Use **Imagen 4 Fast** for speed without ultra-quality needs
3. Batch requests to reduce overhead
4. Use lower resolution (1K) when 2K isn't necessary
5. Consider Google AI Studio free tier for prototyping

---

## Rate Limits & Quotas

### Model-Specific Limits

| Model                             | Requests per Minute (RPM) | Images per Request |
| --------------------------------- | ------------------------- | ------------------ |
| **imagen-3.0-generate-002**       | 20 per project            | 1-4                |
| **imagen-3.0-capability-001**     | 100 per project           | 1-4                |
| **imagen-4.0-generate-001**       | Varies by tier            | 1-4                |
| **imagen-4.0-ultra-generate-001** | Varies by tier            | 1-4                |

### General Quotas

- **Per-Request Limits**: 1-4 images per request
- **Maximum Prompt Length**: 480 tokens
- **Maximum Image Size**: 10 MB (for editing/upscaling)
- **Regional Quotas**: 30,000 online inference requests per minute per region per project

### Requesting Quota Increases

1. Navigate to Google Cloud Console
2. Go to **IAM & Admin** → **Quotas**
3. Filter by **Vertex AI**
4. Select relevant quota metric
5. Click **Edit Quotas** and request increase

---

## Prompt Engineering

### Prompt Structure

Effective prompts include:

1. **Subject**: Main object, person, or scene
2. **Action/State**: What the subject is doing
3. **Setting**: Background or environment
4. **Style**: Artistic style or aesthetic
5. **Technical Details**: Camera settings, lighting
6. **Mood/Atmosphere**: Emotional tone

### Template

```
[Subject] [action] in [setting], [style], [technical details], [atmosphere]
```

### Examples by Quality Level

#### Basic Prompt

```
A cat reading a book
```

#### Detailed Prompt

```
A tabby cat wearing reading glasses, carefully reading a leather-bound book in a cozy library, warm afternoon sunlight streaming through the window, soft focus on background bookshelves
```

#### Advanced Prompt (Imagen 4 Ultra)

```
Close-up shot of a tabby cat wearing round reading glasses, carefully reading a leather-bound book in a cozy Victorian library, warm golden afternoon sunlight streaming through tall arched windows, soft bokeh on background mahogany bookshelves, dust motes floating in light beams, shallow depth of field, shot with 85mm lens at f/1.8, warm color grading, National Geographic photography style
```

### Imagen 4 Specific Tips

1. **Leverage Text Rendering**: Imagen 4 excels at generating text in images

   ```
   A vintage storefront sign reading "CAFÉ ROUGE" in art deco typography, weathered red paint, Paris street scene, 1920s style
   ```

2. **Fine Detail Emphasis**: Imagen 4 captures intricate details

   ```
   Macro photograph of a butterfly wing showing individual iridescent scales, backlit with natural sunlight, extreme close-up, 8K resolution
   ```

3. **Complex Compositions**: Multi-element scenes
   ```
   Busy Japanese street market at dusk with paper lanterns, steam rising from food stalls, neon signs reflecting on wet pavement, people with umbrellas, depth of field with sharp foreground, bokeh lights in background
   ```

### Quality Modifiers

Add these for enhanced quality:

- "highly detailed"
- "8K resolution"
- "professional photography"
- "award-winning"
- "masterpiece"
- "cinematic lighting"
- "sharp focus"

### Art Style References

- **Photorealism**: "photorealistic, high detail, 8K"
- **Impressionism**: "impressionist painting, visible brushstrokes, Monet style"
- **Abstract**: "abstract geometric shapes, vibrant colors, modern art"
- **Illustration**: "digital illustration, concept art, ArtStation style"
- **Vintage Photography**: "vintage 1960s Kodachrome photograph, film grain"

---

## Best Practices

### 1. Choosing the Right Model

| Use Case              | Recommended Model             | Reason                         |
| --------------------- | ----------------------------- | ------------------------------ |
| Highest quality       | imagen-4.0-ultra-generate-001 | Best detail and text rendering |
| Balanced quality/cost | imagen-4.0-generate-001       | Good quality at lower cost     |
| Speed critical        | imagen-4.0-fast-generate-001  | 10x faster generation          |
| Lowest cost           | imagen-3.0-fast-generate-001  | $0.02 per image                |
| Image editing         | imagen-3.0-capability-001     | Specialized editing features   |

### 2. Optimization Strategies

**For Production:**

- Always specify `storageUri` to avoid large base64 responses
- Use Cloud Storage in the same region as Vertex AI endpoint
- Implement retry logic with exponential backoff
- Monitor costs using Google Cloud Console

**For Development:**

- Use Imagen 3 Fast for rapid iteration
- Test prompts with `sampleCount: 1` first
- Use deterministic generation (seed) for A/B testing

### 3. Image Quality Tips

- Use **2K resolution** for Imagen 4 models when detail matters
- Match **aspect ratio** to intended use case
- For **text in images**, be very specific about typography
- For **faces/people**, use clear descriptive terms
- Avoid **overly complex prompts** with Fast models

### 4. Safety and Compliance

- Set appropriate `safetySetting` for your use case
- Use `personGeneration: "dont_allow"` if people aren't needed
- Enable `includeRaiReason` to understand filtering
- Review Google's AI Principles and usage policies

### 5. Cost Management

```python
# Example: Monitoring costs
images_generated = 1000
model_cost_per_image = 0.04  # Imagen 4 Standard

total_cost = images_generated * model_cost_per_image
print(f"Estimated cost: ${total_cost}")
```

---

## Limitations

### Technical Limitations

- **Prompt Length**: Maximum 480 tokens
- **Images Per Request**: Maximum 4
- **Resolution**: 2K max (Imagen 4), 1K max (Imagen 3)
- **Seed Determinism**: Requires `addWatermark: false`
- **Multi-language**: Preview status for non-English

### Content Limitations

1. **Content Moderation**: Refuses unsafe content
2. **Faces**: May struggle with small faces in complex scenes
3. **Thin Structures**: May show artifacts in complicated compositions
4. **Centered Compositions**: Occasionally struggles; specify off-center
5. **Text Rendering**: Imagen 3 has poor text quality (use Imagen 4)

### Model-Specific Limitations

| Feature           | Imagen 3              | Imagen 4 |
| ----------------- | --------------------- | -------- |
| **2K Resolution** | ❌                    | ✅       |
| **Superior Text** | ❌                    | ✅       |
| **Image Editing** | ✅ (Capability model) | ❌       |
| **Upscaling**     | ❌                    | ❌       |

---

## Error Handling

### Common HTTP Errors

#### 400 - Bad Request / Invalid Argument

**Cause**: Content violates Responsible AI policies

**Example Error**:

```
"The prompt could not be submitted. This prompt contains sensitive words that violate Google's Responsible AI practices. Try rephrasing the prompt."
```

**Solution**: Rephrase prompt to avoid sensitive content

#### 403 - Forbidden

**Causes**:

- Missing authentication credentials
- Insufficient IAM permissions
- API not enabled

**Solution**:

```bash
# Enable API
gcloud services enable aiplatform.googleapis.com

# Verify authentication
gcloud auth list

# Check IAM roles
gcloud projects get-iam-policy PROJECT_ID
```

#### 429 - Quota Exceeded

**Example Error**:

```json
{
  "error": {
    "code": 429,
    "message": "Quota exceeded for aiplatform.googleapis.com/generate_content_requests_per_minute_per_project_per_base_model with base model: imagen-3.0-generate"
  }
}
```

**Solution**:

- Implement exponential backoff
- Request quota increase in Cloud Console
- Distribute requests across multiple regions

### Retry Logic Example

```python
import time
import requests

def generate_image_with_retry(prompt, max_retries=3):
    for attempt in range(max_retries):
        try:
            response = requests.post(url, headers=headers, json=data)

            if response.status_code == 429:
                wait_time = 2 ** attempt
                print(f"Rate limit exceeded. Retrying in {wait_time}s...")
                time.sleep(wait_time)
                continue

            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            if attempt == max_retries - 1:
                raise
            time.sleep(2 ** attempt)

    raise Exception("Max retries exceeded")
```

---

## Resources

### Official Documentation

- [Imagen Overview](https://cloud.google.com/vertex-ai/generative-ai/docs/image/overview)
- [Image Generation API](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/imagen-api)
- [Imagen 4 Ultra](https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-ultra-generate-001)
- [Imagen 4 Generate](https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate-001)
- [Imagen 3 Generate](https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate-002)
- [Imagen 3 Capability](https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-capability-001)

### Getting Started

- [Quickstart: Generate Images](https://cloud.google.com/vertex-ai/generative-ai/docs/image/generate-images)
- [Authentication Guide](https://cloud.google.com/vertex-ai/docs/authentication)
- [Vertex AI Locations](https://cloud.google.com/vertex-ai/docs/general/locations)

### Advanced Features

- [Configure Aspect Ratio](https://cloud.google.com/vertex-ai/generative-ai/docs/image/configure-aspect-ratio)
- [Responsible AI Settings](https://cloud.google.com/vertex-ai/generative-ai/docs/image/configure-responsible-ai-safety-settings)
- [Deterministic Images](https://cloud.google.com/vertex-ai/generative-ai/docs/image/generate-deterministic-images)
- [Verify SynthID Watermark](https://cloud.google.com/vertex-ai/generative-ai/docs/image/verify-watermark)

### Pricing and Quotas

- [Pricing Page](https://cloud.google.com/vertex-ai/generative-ai/pricing)
- [Quotas Documentation](https://cloud.google.com/vertex-ai/generative-ai/docs/quotas)

### SDKs and Tools

- [Google Gen AI SDK (Python)](https://googleapis.github.io/python-genai/)
- [Vertex AI Node.js SDK](https://cloud.google.com/nodejs/docs/reference/vertexai/latest)
- [All Code Samples](https://cloud.google.com/vertex-ai/docs/samples)

### Community

- [SynthID Information](https://deepmind.google/discover/blog/identifying-ai-generated-images-with-synthid/)
- [Imagen on DeepMind](https://deepmind.google/models/imagen/)
- [Google Cloud Support](https://cloud.google.com/support)

---

## Changelog

### October 2025

- Comprehensive documentation created covering Imagen 3, 4, and 4 Ultra
- Added 10 aspect ratio support details
- Documented 2K resolution capabilities
- Added SynthID Detector portal information
- Included all rate limits and quotas
- Added multi-language support details

### May 2025

- Imagen 4 family released (Standard, Ultra, Fast)
- 2K resolution support added
- Superior text rendering capabilities
- 10x faster generation with Fast variant

### February 2025

- Imagen 3 Generate 002 model updated

---

**Document Version**: 1.0
**Last Updated**: October 10, 2025
**API Version**: Vertex AI v1

---

_This documentation provides comprehensive coverage of Google Cloud Vertex AI Imagen 3, Imagen 4, and Imagen 4 Ultra, including complete API specifications, code examples, pricing, best practices, and troubleshooting guidance._
