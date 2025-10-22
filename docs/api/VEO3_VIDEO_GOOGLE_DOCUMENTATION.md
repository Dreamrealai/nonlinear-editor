# Veo 3 Video Generation - Complete API Documentation

**Last Updated:** October 10, 2025
**Documentation Sources:**
- https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/veo-video-generation
- https://ai.google.dev/gemini-api/docs/video
- https://cloud.google.com/vertex-ai/generative-ai/docs/video/overview
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/rate-limits

---

## Table of Contents

1. [Overview](#overview)
2. [Model Versions](#model-versions)
3. [API Reference](#api-reference)
4. [Authentication](#authentication)
5. [Pricing](#pricing)
6. [Rate Limits](#rate-limits)
7. [Code Examples](#code-examples)
8. [Prompt Guide](#prompt-guide)
9. [Limitations](#limitations)
10. [Best Practices](#best-practices)

---

## Overview

Veo 3 is Google's state-of-the-art model for generating high-fidelity, 8-second 720p or 1080p videos from text prompts or image prompts, featuring stunning realism and natively generated audio. Veo 3 excels at a wide range of visual and cinematic styles.

### Key Features

- **Native Audio Generation**: Veo 3 natively generates audio with video, including dialogue, sound effects, and ambient noise
- **High Resolution**: Supports 720p and 1080p (16:9 only) video generation
- **Input Modalities**: Text-to-Video and **Image-to-Video** (✅ Supported since mid-2025)
- **Frame Rate**: 24fps
- **Video Duration**: 4, 6, or 8 seconds (default: 8 seconds)
- **Context Window**: 1M tokens for prompts
- **Aspect Ratios**: 16:9 (landscape) and 9:16 (portrait, 720p only)

---

## Model Versions

### Available Models

#### Veo 3 (Standard)
- **Model ID**: `veo-3.0-generate-001`
- **Status**: Stable
- **Resolution**: 720p & 1080p (16:9 only)
- **Audio**: Always on
- **Use Case**: High-quality video generation with audio
- **Latest Update**: July 2025

#### Veo 3 Fast
- **Model ID**: `veo-3.0-fast-generate-001`
- **Status**: Stable
- **Resolution**: 720p & 1080p (16:9 only)
- **Audio**: Always on
- **Use Case**: Optimized for speed and business use cases (ads, A/B testing, social media)
- **Latest Update**: July 2025

#### Veo 3 Preview
- **Model ID**: `veo-3.0-generate-preview`
- **Status**: Preview
- **Resolution**: 720p
- **Audio**: Always on
- **Use Case**: Latest experimental features

#### Veo 3 Fast Preview
- **Model ID**: `veo-3.0-fast-generate-preview`
- **Status**: Preview
- **Resolution**: 720p
- **Audio**: Always on
- **Use Case**: Fast generation with latest features

#### Veo 2 (Legacy)
- **Model ID**: `veo-2.0-generate-001`
- **Status**: Stable
- **Resolution**: 720p only
- **Audio**: Silent only
- **Duration**: 5-8 seconds
- **Videos per Request**: 1 or 2

---

## API Reference

### Vertex AI API

#### HTTP Request Endpoint

```
POST https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models/{MODEL_ID}:predictLongRunning
```

**Supported Locations:**
- `us-central1` (recommended)
- See [Generative AI on Vertex AI locations](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/locations-genai) for full list

### Gemini API

#### HTTP Request Endpoint

```
POST https://generativelanguage.googleapis.com/v1beta/models/{MODEL_ID}:predictLongRunning
```

---

## Request Parameters

### Instances

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes (for text-to-video) | Text description to guide video generation. Max 1,024 tokens. |
| `image` | object | Optional | Initial image to animate (Image-to-Video) |
| `image.bytesBase64Encoded` | string | - | Base64-encoded image string |
| `image.gcsUri` | string | - | Cloud Storage URI (gs://...) |
| `image.mimeType` | string | Required with image | `image/jpeg` or `image/png` |
| `lastFrame` | object | Optional | Image for last frame (Veo 2 only) |
| `video` | object | Optional | Video to extend (Veo 2 only) |
| `referenceImages` | array | Optional | Up to 3 asset images or 1 style image (Veo 2 experimental) |

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `aspectRatio` | string | "16:9" | `"16:9"` or `"9:16"` (720p only) |
| `resolution` | string | "720p" | `"720p"` or `"1080p"` (16:9 only, Veo 3 only) |
| `durationSeconds` | integer | 8 | Veo 3: `4`, `6`, or `8`<br>Veo 2: `5` to `8` |
| `generateAudio` | boolean | - | Required for Veo 3. Must be `true` for Veo 3 models. Not supported by Veo 2. |
| `negativePrompt` | string | - | Text describing what to exclude from the video |
| `personGeneration` | string | "allow_adult" | Veo 3: `"allow_adult"` only<br>Veo 2: `"allow_adult"`, `"dont_allow"` |
| `sampleCount` | integer | 1 | Number of videos to generate (1-4) |
| `seed` | uint32 | - | For deterministic generation (0-4,294,967,295). Slightly improves determinism but doesn't guarantee it. |
| `storageUri` | string | - | Cloud Storage bucket URI (gs://...). If not provided, base64-encoded video returned in response. |
| `compressionQuality` | string | "optimized" | `"optimized"` or `"lossless"` |
| `enhancePrompt` | boolean | true | Use Gemini to enhance prompts |

### Regional Limitations

**EU, UK, CH, MENA locations:**
- Veo 3: `personGeneration` can only be `"allow_adult"`
- Veo 2: `personGeneration` can be `"allow_adult"` or `"dont_allow"` (default: `"dont_allow"`)

---

## Request Examples

### Text-to-Video (Vertex AI)

```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  https://us-central1-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/us-central1/publishers/google/models/veo-3.0-generate-001:predictLongRunning \
  -d '{
    "instances": [{
      "prompt": "A close up of two people staring at a cryptic drawing on a wall, torchlight flickering. A man murmurs, \"This must be it. That is the secret code.\" The woman looks at him and whispering excitedly, \"What did you find?\""
    }],
    "parameters": {
      "durationSeconds": 8,
      "resolution": "720p",
      "aspectRatio": "16:9",
      "generateAudio": true,
      "storageUri": "gs://your-bucket/output/",
      "sampleCount": 1
    }
  }'
```

### Image-to-Video (Vertex AI)

```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  https://us-central1-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/us-central1/publishers/google/models/veo-3.0-generate-preview:predictLongRunning \
  -d '{
    "instances": [{
      "prompt": "Extreme close-up of a cluster of vibrant wildflowers swaying gently in a sun-drenched meadow.",
      "image": {
        "bytesBase64Encoded": "BASE64_ENCODED_IMAGE_STRING",
        "mimeType": "image/png"
      }
    }],
    "parameters": {
      "durationSeconds": 8,
      "storageUri": "gs://your-bucket/output/"
    }
  }'
```

### Python (Gemini API)

```python
import time
from google import genai
from google.genai import types

client = genai.Client()

prompt = """A close up of two people staring at a cryptic drawing on a wall, torchlight flickering.
A man murmurs, 'This must be it. That's the secret code.' The woman looks at him and whispering excitedly, 'What did you find?'"""

operation = client.models.generate_videos(
    model="veo-3.0-generate-001",
    prompt=prompt,
)

# Poll the operation status until the video is ready.
while not operation.done:
    print("Waiting for video generation to complete...")
    time.sleep(10)
    operation = client.operations.get(operation)

# Download the generated video.
generated_video = operation.response.generated_videos[0]
client.files.download(file=generated_video.video)
generated_video.video.save("dialogue_example.mp4")
print("Generated video saved to dialogue_example.mp4")
```

### Python with Image Input (Gemini API)

```python
import time
from google import genai
from google.genai.types import GenerateVideosConfig, Image

client = genai.Client()

operation = client.models.generate_videos(
    model="veo-3.0-generate-preview",
    prompt="Extreme close-up of a cluster of vibrant wildflowers swaying gently in a sun-drenched meadow.",
    image=Image(
        gcs_uri="gs://cloud-samples-data/generative-ai/image/flowers.png",
        mime_type="image/png",
    ),
    config=GenerateVideosConfig(
        aspect_ratio="16:9",
        output_gcs_uri="gs://your-bucket/output/",
    ),
)

while not operation.done:
    time.sleep(15)
    operation = client.operations.get(operation)

if operation.response:
    print(operation.result.generated_videos[0].video.uri)
```

### JavaScript (Gemini API)

```javascript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

const prompt = `A close up of two people staring at a cryptic drawing on a wall, torchlight flickering.
A man murmurs, 'This must be it. That's the secret code.' The woman looks at him and whispering excitedly, 'What did you find?'`;

let operation = await ai.models.generateVideos({
    model: "veo-3.0-generate-001",
    prompt: prompt,
});

// Poll the operation status until the video is ready.
while (!operation.done) {
    console.log("Waiting for video generation to complete...")
    await new Promise((resolve) => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({
        operation: operation,
    });
}

// Download the generated video.
ai.files.download({
    file: operation.response.generatedVideos[0].video,
    downloadPath: "dialogue_example.mp4",
});
console.log(`Generated video saved to dialogue_example.mp4`);
```

### Go (Gemini API)

```go
package main

import (
    "context"
    "log"
    "os"
    "time"

    "google.golang.org/genai"
)

func main() {
    ctx := context.Background()
    client, err := genai.NewClient(ctx, nil)
    if err != nil {
        log.Fatal(err)
    }

    prompt := `A close up of two people staring at a cryptic drawing on a wall, torchlight flickering.
    A man murmurs, 'This must be it. That's the secret code.' The woman looks at him and whispering excitedly, 'What did you find?'`

    operation, _ := client.Models.GenerateVideos(
        ctx,
        "veo-3.0-generate-001",
        prompt,
        nil,
        nil,
    )

    // Poll the operation status until the video is ready.
    for !operation.Done {
        log.Println("Waiting for video generation to complete...")
        time.Sleep(10 * time.Second)
        operation, _ = client.Operations.GetVideosOperation(ctx, operation, nil)
    }

    // Download the generated video.
    video := operation.Response.GeneratedVideos[0]
    client.Files.Download(ctx, video.Video, nil)
    fname := "dialogue_example.mp4"
    _ = os.WriteFile(fname, video.Video.VideoBytes, 0644)
    log.Printf("Generated video saved to %s\n", fname)
}
```

---

## Response Format

### Initial Response (Operation Started)

```json
{
  "name": "projects/PROJECT_ID/locations/us-central1/publishers/google/models/veo-3.0-generate-001/operations/OPERATION_ID"
}
```

### Polling the Operation

**Request:**
```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  https://us-central1-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/us-central1/publishers/google/models/MODEL_ID:fetchPredictOperation \
  -d '{
    "operationName": "projects/PROJECT_ID/locations/us-central1/publishers/google/models/MODEL_ID/operations/OPERATION_ID"
  }'
```

**Response (In Progress):**
```json
{
  "name": "projects/PROJECT_ID/locations/us-central1/publishers/google/models/veo-3.0-generate-001/operations/OPERATION_ID",
  "done": false
}
```

**Response (Completed):**
```json
{
  "name": "projects/PROJECT_ID/locations/us-central1/publishers/google/models/veo-3.0-generate-001/operations/OPERATION_ID",
  "done": true,
  "response": {
    "@type": "type.googleapis.com/cloud.ai.large_models.vision.GenerateVideoResponse",
    "raiMediaFilteredCount": 0,
    "videos": [
      {
        "gcsUri": "gs://BUCKET_NAME/TIMESTAMPED_FOLDER/sample_0.mp4",
        "mimeType": "video/mp4"
      }
    ]
  }
}
```

### Response Fields

| Field | Description |
|-------|-------------|
| `name` | Full operation name with unique operation ID |
| `done` | Boolean indicating if operation is complete |
| `response.@type` | Response type identifier |
| `response.raiMediaFilteredCount` | Count of videos filtered by safety policies (0 if none) |
| `response.raiMediaFilteredReasons` | Reasons for filtered videos (if any) |
| `response.videos` | Array of generated videos |
| `response.videos[].gcsUri` | Cloud Storage URI of video |
| `response.videos[].bytesBase64Encoded` | Base64-encoded video (if no storage URI provided) |
| `response.videos[].mimeType` | Video MIME type (video/mp4) |

---

## Authentication

### Vertex AI (Google Cloud)

1. **Set up Google Cloud Project:**
   ```bash
   gcloud config set project PROJECT_ID
   ```

2. **Enable Vertex AI API:**
   ```bash
   gcloud services enable aiplatform.googleapis.com
   ```

3. **Authenticate:**
   ```bash
   gcloud auth application-default login
   ```

4. **Get Access Token (for curl):**
   ```bash
   gcloud auth print-access-token
   ```

### Gemini API

1. **Get API Key:**
   - Visit https://aistudio.google.com/apikey
   - Create or select a project
   - Generate an API key

2. **Set Environment Variables:**
   ```bash
   export GEMINI_API_KEY="your-api-key"
   ```

3. **Python SDK Setup:**
   ```bash
   pip install google-genai
   ```

4. **Set environment variables for Vertex AI:**
   ```bash
   export GOOGLE_CLOUD_PROJECT=PROJECT_ID
   export GOOGLE_CLOUD_LOCATION=global
   export GOOGLE_GENAI_USE_VERTEXAI=True
   ```

---

## Pricing

### Gemini API Pricing (Per Second of Video)

| Model | Free Tier | Paid Tier (per second) |
|-------|-----------|------------------------|
| **Veo 3 Standard** (with audio) | Not available | $0.40 USD |
| **Veo 3 Fast** (with audio) | Not available | $0.15 USD |
| **Veo 2** (no audio) | Not available | $0.35 USD |

**Notes:**
- Pricing is per second of generated video
- 8-second video (Veo 3 Standard): $3.20
- 8-second video (Veo 3 Fast): $1.20
- Audio is always included in Veo 3 pricing
- Data used in Free Tier may be used to improve Google's products
- Data in Paid Tier is NOT used to improve Google's products

### Vertex AI Pricing

Pricing may differ from Gemini API. See [Vertex AI pricing page](https://cloud.google.com/vertex-ai/generative-ai/pricing) for details.

### Cost Optimization Tips

1. **Use Veo 3 Fast** for high-volume use cases (62.5% cost reduction vs Standard)
2. **Adjust duration** - Generate 4-6 second videos when 8 seconds isn't necessary
3. **Batch generation** - Request multiple samples in single API call when appropriate
4. **Monitor usage** - Track generation costs in Google Cloud Console

---

## Rate Limits

### Gemini API Rate Limits

| Tier | Veo 3 RPM | Veo 3 RPD | Veo 2 RPM | Veo 2 RPD |
|------|-----------|-----------|-----------|-----------|
| **Free** | N/A | N/A | N/A | N/A |
| **Tier 1** (Billing enabled) | 2 | 10 | 2 | 50 |
| **Tier 2** ($250+ spent) | 4 | 50 | 2 | 50 |
| **Tier 3** ($1,000+ spent) | 10 | 500 | 2 | 50 |

**Legend:**
- RPM = Requests Per Minute
- RPD = Requests Per Day

### Tier Qualifications

| Tier | Requirements |
|------|--------------|
| Free | Users in eligible countries |
| Tier 1 | Billing account linked to project |
| Tier 2 | Total spend > $250 AND at least 30 days since successful payment |
| Tier 3 | Total spend > $1,000 AND at least 30 days since successful payment |

### Request Latency

- **Minimum:** 11 seconds
- **Maximum:** 6 minutes (during peak hours)

### Video Retention

- Generated videos stored on server for **2 days**
- Download videos within 2 days to save locally
- Videos automatically deleted after 2 days

---

## Prompt Guide

### Prompt Structure

Good prompts should include:

1. **Subject**: The main focus (person, animal, object, scenery)
2. **Action**: What the subject is doing
3. **Style**: Creative direction (sci-fi, film noir, cartoon, etc.)
4. **Camera Motion** (Optional): Aerial view, dolly shot, tracking shot, etc.
5. **Composition** (Optional): Wide shot, close-up, single-shot, two-shot
6. **Focus/Lens** (Optional): Shallow focus, macro lens, wide-angle lens
7. **Ambiance** (Optional): Blue tones, warm tones, night, sunrise

### Audio Prompting (Veo 3 Only)

Veo 3 generates audio synchronized with video. Include audio cues in your prompts:

**Dialogue:**
- Use quotes for speech
- Example: "This must be the key," he murmured.

**Sound Effects (SFX):**
- Explicitly describe sounds
- Example: tires screeching loudly, engine roaring

**Ambient Noise:**
- Describe the environment's soundscape
- Example: A faint, eerie hum resonates in the background

#### Audio Examples

| Detail Level | Prompt | Description |
|--------------|--------|-------------|
| **High Detail** | A close up of two people staring at a cryptic drawing on a wall, torchlight flickering. "This must be the key," he murmured, tracing the pattern. "What does it mean though?" she asked, puzzled, tilting her head. Damp stone, intricate carvings, hidden symbols. A faint, eerie hum resonates in the background. | Includes dialogue, sound effects, and ambient noise |
| **Medium Detail** | Camping (Stop Motion): Camper: "I'm one with nature now!" Bear: "Nature would prefer some personal space". | Includes only dialogue |

### Example Prompts

#### Dialogue & Sound Effects
```
A close up of two people staring at a cryptic drawing on a wall, torchlight flickering.
A man murmurs, 'This must be it. That's the secret code.'
The woman looks at him and whispering excitedly, 'What did you find?'
```

#### Cinematic Realism
```
A close-up cinematic shot follows a desperate man in a weathered green trench coat
as he dials a rotary phone mounted on a gritty brick wall, bathed in the eerie glow
of a green neon sign. The camera dollies in, revealing the tension in his jaw and
the desperation etched on his face as he struggles to make the call.
```

#### Creative Animation
```
Create a short 3D animated scene in a joyful cartoon style. A cute creature with
snow leopard-like fur, large expressive eyes, and a friendly, rounded form happily
prances through a whimsical winter forest. The scene should feature rounded,
snow-covered trees, gentle falling snowflakes, and warm sunlight filtering through
the branches.
```

### Negative Prompts

Specify what NOT to include in the video:

**DON'T:**
- ❌ "No walls" or "don't show walls"

**DO:**
- ✅ "wall, frame" (describe what you don't want)

Example:
```json
{
  "prompt": "Generate a short, stylized animation of a large, solitary oak tree...",
  "negativePrompt": "urban background, man-made structures, dark, stormy, or threatening atmosphere"
}
```

### Image-to-Video Tips

When using reference images:

1. **Recommended resolution:** 720p (1280x720) or higher
2. **Aspect ratio:** 16:9 or 9:16
3. **Align descriptions:** Ensure actions and speech align with subjects in the image
4. **Multiple subjects:** Clearly specify which character performs actions
   - Example: "The man in the red hat says..."
   - Example: "The woman in the blue dress replies..."

### Prompt Best Practices

1. **Be descriptive**: Use adjectives and adverbs
2. **Provide context**: Include background information
3. **Reference styles**: Mention specific artistic styles or movements
4. **Enhance facial details**: Use words like "portrait" for close-ups
5. **Specify camera work**: Mention specific shots and movements
6. **Define ambiance**: Describe lighting and color palettes

---

## Limitations

### Technical Limitations

- **Request latency:** 11 seconds (min) to 6 minutes (max during peak)
- **Video retention:** 2 days on server
- **Watermarking:** All videos watermarked with SynthID
- **Safety filters:** Content passed through safety and memorization checks
- **Audio errors:** Veo 3 may block videos due to audio safety filters (no charge)
- **Seed determinism:** Seed parameter improves but doesn't guarantee determinism

### Person Generation Restrictions

**Global (default):**
- Veo 3 Text-to-Video: `allow_adult` only
- Veo 3 Image-to-Video: `allow_adult` only
- Veo 2 Text-to-Video: `allow_all`, `allow_adult`, `dont_allow`
- Veo 2 Image-to-Video: `allow_adult`, `dont_allow`

**EU, UK, CH, MENA:**
- Veo 3: `allow_adult` only
- Veo 2: `dont_allow` (default) and `allow_adult`

If approval is required, contact your Google account representative.

### Model-Specific Limitations

| Feature | Veo 3 | Veo 2 |
|---------|-------|-------|
| Audio | ✅ Always on | ❌ Silent only |
| 1080p | ✅ (16:9 only) | ❌ 720p only |
| Image-to-Video | ✅ Supported (since mid-2025) | ✅ Supported |
| Video Extension | ❌ Not supported | ✅ Supported |
| Last Frame Control | ❌ Not supported | ✅ Supported |
| Reference Images | ❌ Not supported | ✅ (Experimental) |

---

## Best Practices

### 1. Handling Long-Running Operations

Video generation is asynchronous. Always implement polling:

```python
import time

while not operation.done:
    print("Waiting for video generation...")
    time.sleep(10)  # Poll every 10 seconds
    operation = client.operations.get(operation)
```

### 2. Error Handling

```python
try:
    operation = client.models.generate_videos(
        model="veo-3.0-generate-001",
        prompt=prompt,
    )

    while not operation.done:
        time.sleep(10)
        operation = client.operations.get(operation)

    if operation.response:
        # Check for filtered content
        if operation.response.rai_media_filtered_count > 0:
            print(f"Warning: {operation.response.rai_media_filtered_count} videos filtered")
            print(f"Reasons: {operation.response.rai_media_filtered_reasons}")

        # Download videos
        for idx, video in enumerate(operation.response.generated_videos):
            client.files.download(file=video.video)
            video.video.save(f"output_{idx}.mp4")

except Exception as e:
    print(f"Error generating video: {e}")
```

### 3. Storage Management

**Use Cloud Storage:**
```python
config = GenerateVideosConfig(
    output_gcs_uri="gs://your-bucket/videos/",
    aspect_ratio="16:9",
    resolution="1080p"
)
```

**Benefits:**
- Avoids large base64-encoded responses
- Organized storage with timestamps
- Easy sharing and archiving
- Automatic retention management

### 4. Prompt Engineering

**Start Simple:**
```
A cat reading a book
```

**Add Detail:**
```
Close-up shot of a tabby cat wearing reading glasses, carefully reading
a leather-bound book in a cozy library, warm afternoon sunlight streaming
through the window, soft focus on background bookshelves
```

**Include Audio (Veo 3):**
```
Close-up shot of a tabby cat wearing reading glasses, carefully reading
a leather-bound book in a cozy library, warm afternoon sunlight streaming
through the window, soft focus on background bookshelves. The cat purrs
softly. Pages rustle gently. Clock ticks in the background.
```

### 5. Optimize for Cost

```python
# Use Veo 3 Fast for lower priority content
operation = client.models.generate_videos(
    model="veo-3.0-fast-generate-001",  # 62.5% cheaper
    prompt=prompt,
    config=GenerateVideosConfig(
        duration_seconds=6,  # Shorter if 8s not needed
    )
)
```

### 6. Batch Processing

Generate multiple variations:
```python
config = GenerateVideosConfig(
    sample_count=4,  # Generate 4 variations
    aspect_ratio="16:9"
)
```

### 7. Monitoring and Logging

```python
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

logger.info(f"Starting video generation with prompt: {prompt}")
logger.info(f"Model: {model_id}")
logger.info(f"Config: {config}")

# Track operation
start_time = time.time()
while not operation.done:
    elapsed = time.time() - start_time
    logger.info(f"Waiting... Elapsed: {elapsed:.1f}s")
    time.sleep(10)
    operation = client.operations.get(operation)

logger.info(f"Video generated in {time.time() - start_time:.1f}s")
```

---

## Safety and Responsible AI

### Safety Filters

Veo applies safety filters to:
- Block prompts violating usage policies
- Filter generated content with offensive material
- Check for memorization of copyrighted content

### SynthID Watermarking

All Veo-generated videos include SynthID watermarking for:
- Identifying AI-generated content
- Preventing misuse
- Maintaining transparency

### Usage Policies

Prompts violating [terms and guidelines](https://ai.google.dev/gemini-api/docs/usage-policies#abuse-monitoring) are blocked.

To report abuse: [Report suspected abuse form](https://support.google.com/code/contact/cloud_platform_report)

---

## Troubleshooting

### Common Issues

#### 1. Operation Timeout
**Problem:** Video generation takes longer than expected

**Solution:**
- Expected range: 11 seconds to 6 minutes
- Increase polling interval during peak hours
- Check operation status periodically

#### 2. Safety Filter Blocks
**Problem:** Video blocked by safety filters

**Solution:**
- Review prompt for policy violations
- Modify prompt to remove concerning content
- Check `raiMediaFilteredReasons` in response

#### 3. Audio Generation Errors
**Problem:** Veo 3 blocks video due to audio issues

**Solution:**
- You are not charged for blocked videos
- Simplify audio descriptions
- Avoid complex dialogue or sound effects

#### 4. Rate Limit Exceeded
**Problem:** 429 error - too many requests

**Solution:**
- Check current tier limits
- Implement exponential backoff
- Upgrade to higher tier if needed
- Request rate limit increase

#### 5. Person Generation Denied
**Problem:** Request denied for generating people

**Solution:**
- Check regional restrictions
- Verify `personGeneration` parameter
- Contact Google account representative for approval

---

## Additional Resources

### Documentation
- [Veo Overview](https://cloud.google.com/vertex-ai/generative-ai/docs/video/overview)
- [Generate Videos from Text](https://cloud.google.com/vertex-ai/generative-ai/docs/video/generate-videos-from-text)
- [Generate Videos from Images](https://cloud.google.com/vertex-ai/generative-ai/docs/video/generate-videos-from-an-image)
- [Prompt Guide](https://cloud.google.com/vertex-ai/generative-ai/docs/video/video-gen-prompt-guide)
- [Responsible AI Guidelines](https://cloud.google.com/vertex-ai/generative-ai/docs/video/responsible-ai-and-usage-guidelines)

### Tools
- [Vertex AI Studio](https://console.cloud.google.com/vertex-ai/studio/media/generate;tab=video)
- [Google AI Studio](https://aistudio.google.com/)
- [Veo Colab Notebook](https://colab.research.google.com/github/GoogleCloudPlatform/generative-ai/blob/main/vision/getting-started/veo3_video_generation.ipynb)

### SDKs
- [Python SDK](https://googleapis.github.io/python-genai/)
- [JavaScript SDK](https://www.npmjs.com/package/@google/genai)
- [Go SDK](https://pkg.go.dev/google.golang.org/genai)

### Support
- [Gemini API Community](https://discuss.ai.google.dev/c/gemini-api/)
- [Google Cloud Support](https://cloud.google.com/support)
- [Rate Limit Increase Request](https://forms.gle/ETzX94k8jf7iSotH9)

---

## Changelog

### July 2025
- Veo 3 Standard and Veo 3 Fast released (stable)
- Native audio generation introduced
- 1080p support added (16:9 only)
- 4, 6, 8 second duration options

### April 2025
- Veo 2 released

---

**End of Documentation**

*This documentation is based on official Google documentation as of October 10, 2025. Please check official sources for the latest updates.*
