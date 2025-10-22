# Vertex AI Gemini 2.5 Flash - Complete Documentation

**Last Updated:** October 10, 2025
**Sources:** Google Cloud Vertex AI Documentation

---

## Table of Contents

1. [Overview](#overview)
2. [Model Specifications](#model-specifications)
3. [Authentication & Setup](#authentication--setup)
4. [Multimodal Capabilities](#multimodal-capabilities)
5. [Image Generation](#image-generation)
6. [Image Understanding](#image-understanding)
7. [Parameters & Configuration](#parameters--configuration)
8. [Code Examples](#code-examples)
9. [Rate Limits & Quotas](#rate-limits--quotas)
10. [Pricing](#pricing)
11. [Best Practices](#best-practices)
12. [Limitations](#limitations)

---

## Overview

Gemini 2.5 Flash is Google's best model in terms of price and performance, offering well-rounded capabilities. It is the first Flash model to feature **thinking capabilities**, which lets you see the thinking process that the model goes through when generating its response.

### Key Features

- **Multimodal Support**: Text, Code, Images, Audio, Video
- **Output Modalities**: Text and Images (with `gemini-2.5-flash-image`)
- **Thinking Capabilities**: See model's reasoning process
- **Large Context Window**: Up to 1,048,576 input tokens
- **Maximum Output**: 65,535 tokens (default)
- **Knowledge Cutoff**: January 2025


### Technical Report

For detailed technical information including performance benchmarks, training datasets, sustainability efforts, intended usage and limitations, and approach to ethics and safety, see the [Gemini 2.5 Technical Report](https://storage.googleapis.com/deepmind-media/gemini/gemini_v2_5_report.pdf).

---

## Model Specifications

### Model Versions

#### gemini-2.5-flash (GA)

| Property | Details |
|----------|---------|
| **Model ID** | `gemini-2.5-flash` |
| **Launch Stage** | GA (Generally Available) |
| **Release Date** | June 17, 2025 |
| **Discontinuation Date** | June 17, 2026 |
| **Input Size Limit** | 500 MB |

#### gemini-2.5-flash-preview-09-2025 (Preview)

| Property | Details |
|----------|---------|
| **Model ID** | `gemini-2.5-flash-preview-09-2025` |
| **Launch Stage** | Public Preview |
| **Release Date** | September 25, 2025 |

#### gemini-2.5-flash-image (Image Generation)

| Property | Details |
|----------|---------|
| **Model ID** | `gemini-2.5-flash-image` |
| **Capabilities** | Text and Image generation |
| **Image Resolution** | 1024px |
| **Aspect Ratios** | 1:1, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9 |

#### gemini-live-2.5-flash (Live API)

| Property | Details |
|----------|---------|
| **Model ID** | `gemini-live-2.5-flash` |
| **Launch Stage** | Private GA |
| **Release Date** | June 17, 2025 |

---

## Supported Inputs & Outputs

### Input Modalities
- Text
- Code
- Images (up to 3,000 per prompt)
- Audio (up to ~8.4 hours or 1M tokens)
- Video (up to ~45 min with audio, ~1 hour without)

### Output Modalities
- Text (all models)
- Images (with `gemini-2.5-flash-image`)

### Technical Specifications

#### Images
- **Maximum images per prompt**: 3,000
- **Maximum image size**: 7 MB
- **Supported MIME types**: `image/png`, `image/jpeg`, `image/webp`

#### Documents
- **Maximum files per prompt**: 3,000
- **Maximum pages per file**: 1,000
- **Maximum file size (API/Cloud Storage)**: 50 MB
- **Maximum file size (Console upload)**: 7 MB
- **Supported MIME types**: `application/pdf`, `text/plain`

#### Video
- **Maximum video length (with audio)**: ~45 minutes
- **Maximum video length (without audio)**: ~1 hour
- **Maximum videos per prompt**: 10
- **Supported MIME types**: `video/x-flv`, `video/quicktime`, `video/mpeg`, `video/mpegs`, `video/mpg`, `video/mp4`, `video/webm`, `video/wmv`, `video/3gpp`

#### Audio
- **Maximum audio length**: ~8.4 hours or up to 1 million tokens
- **Maximum audio files per prompt**: 1
- **Speech capabilities**: Audio summarization, transcription, translation
- **Supported MIME types**: `audio/x-aac`, `audio/flac`, `audio/mp3`, `audio/m4a`, `audio/mpeg`, `audio/mpga`, `audio/mp4`, `audio/ogg`, `audio/pcm`, `audio/wav`, `audio/webm`

---

## Supported Capabilities

### Core Features

✅ **Supported:**
- [Grounding with Google Search](https://cloud.google.com/vertex-ai/generative-ai/docs/grounding/grounding-with-google-search)
- [Code execution](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/code-execution)
- [Tuning](https://cloud.google.com/vertex-ai/generative-ai/docs/models/tune-models)
- [System instructions](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/system-instruction-introduction)
- [Structured output](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/control-generated-output)
- [Function calling](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling)
- [Count Tokens](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/get-token-count)
- [Live API](https://cloud.google.com/vertex-ai/generative-ai/docs/live-api) (Preview)
- [Thinking](https://cloud.google.com/vertex-ai/generative-ai/docs/thinking)
- [Vertex AI RAG Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/rag-engine/rag-overview)
- [Chat completions](https://cloud.google.com/vertex-ai/generative-ai/docs/migrate/openai/overview)

### Usage Types

✅ **Supported:**
- [Provisioned Throughput](https://cloud.google.com/vertex-ai/generative-ai/docs/provisioned-throughput)
- [Dynamic shared quota](https://cloud.google.com/vertex-ai/generative-ai/docs/dsq)
- [Batch prediction](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/batch-prediction-gemini)

❌ **Not Supported:**
- Fixed quota

---

## Authentication & Setup

### Prerequisites

1. **Google Cloud Project**: With billing enabled
2. **Vertex AI API**: Enabled
3. **IAM Role**: `roles/aiplatform.user` (Vertex AI User)

### Authentication Methods

#### Option 1: Application Default Credentials (ADC)

**Step 1: Configure Your Project**

```bash
# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com

# Initialize gcloud CLI
gcloud init
```

**Step 2: Create Local Authentication Credentials**

```bash
gcloud auth application-default login
```

**Step 3: Set Environment Variables**

```bash
# Replace with your project details
export GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID
export GOOGLE_CLOUD_LOCATION=global
export GOOGLE_GENAI_USE_VERTEXAI=True
```

#### Option 2: API Key

Set up API key authentication (details vary by SDK - see SDK documentation).

### Required IAM Roles

To use the Gemini API in Vertex AI, you need the **Vertex AI User** role (`roles/aiplatform.user`).

**To grant this role:**

```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="user:YOUR_EMAIL" \
    --role="roles/aiplatform.user"
```

---

## SDK Installation

### Python Gen AI SDK

```bash
pip install --upgrade google-genai
```

Set environment variables:
```bash
export GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID
export GOOGLE_CLOUD_LOCATION=global
export GOOGLE_GENAI_USE_VERTEXAI=True
```

### Node.js Gen AI SDK

```bash
npm install @google/genai
```

Set environment variables:
```bash
export GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID
export GOOGLE_CLOUD_LOCATION=global
export GOOGLE_GENAI_USE_VERTEXAI=True
```

### Java Gen AI SDK

Add to your `pom.xml`:
```xml
<dependencies>
  <dependency>
    <groupId>com.google.genai</groupId>
    <artifactId>google-genai</artifactId>
    <version>0.7.0</version>
  </dependency>
</dependencies>
```

Set environment variables:
```bash
export GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID
export GOOGLE_CLOUD_LOCATION=global
export GOOGLE_GENAI_USE_VERTEXAI=True
```

### Go Gen AI SDK

```bash
go get google.golang.org/genai
```

---

## Multimodal Capabilities

### Image Generation

Gemini 2.5 Flash Image (`gemini-2.5-flash-image`) supports:

- **Text to Image**: Generate images from descriptive text
- **Text Rendering in Images**: Generate images with long-form text
- **Interleaved Image and Text**: Generate blogs/recipes with inline images
- **Image Editing**: Conversational image manipulation
- **Locale-aware Generation**: Context-aware based on user location

#### Image Generation Features

- Generate images in 1024px resolution
- Support for generating images of people
- Flexible safety filters
- Multiple aspect ratio support

#### Best Practices for Image Generation

1. **Be Specific**: More details give you more control
   - ❌ "fantasy armor"
   - ✅ "ornate elven plate armor, etched with silver leaf patterns, with a high collar and pauldrons shaped like falcon wings"

2. **Provide Context and Intent**: Explain the purpose
   - ✅ "Create a logo for a high-end, minimalist skincare brand"

3. **Iterate and Refine**: Use follow-up prompts
   - "Make the lighting warmer"
   - "Change the character's expression to be more serious"

4. **Use Step-by-Step Instructions**: For complex scenes
   - "First, create a background of a serene, misty forest at dawn"
   - "Then, in the foreground, add a moss-covered ancient stone altar"
   - "Finally, place a single, glowing sword on top of the altar"

5. **Describe What You Want (Not What You Don't)**:
   - ❌ "no cars"
   - ✅ "an empty, deserted street with no signs of traffic"

6. **Control the Camera**: Use photographic terms
   - "wide-angle shot", "macro shot", "low-angle perspective"

7. **Prompt for Images**: Use explicit phrases
   - "create an image of", "generate an image of"

#### Image Generation Limitations

- Best performance with: EN, es-MX, ja-JP, zh-CN, hi-IN
- No audio or video inputs supported for image generation
- May not create exact number of images requested
- Maximum 3 input images for best results
- For text in images: first generate the text, then generate image with that text
- Model might only create text instead of images (be explicit in your request)
- Model might create text as an image (specify text output if needed)
- May stop generating before completion (retry or adjust prompt)
- `FinishReason` will be `STOP` for unsafe content

---

## Image Generation

### Generate Images with Text Input

#### Python

```python
from google import genai
from google.genai.types import GenerateContentConfig, Modality
from PIL import Image
from io import BytesIO

client = genai.Client()

response = client.models.generate_content(
    model="gemini-2.5-flash-image",
    contents="Generate an image of the Eiffel tower with fireworks in the background.",
    config=GenerateContentConfig(
        response_modalities=[Modality.TEXT, Modality.IMAGE],
        candidate_count=1,
        safety_settings=[
            {"method": "PROBABILITY"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT"},
            {"threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        ],
    ),
)

for part in response.candidates[0].content.parts:
    if part.text:
        print(part.text)
    elif part.inline_data:
        image = Image.open(BytesIO(part.inline_data.data))
        image.save("output_folder/example-image-eiffel-tower.png")
```

#### Node.js

```javascript
const fs = require('fs');
const {GoogleGenAI, Modality} = require('@google/genai');

const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
const GOOGLE_CLOUD_LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

async function generateContent(projectId = GOOGLE_CLOUD_PROJECT, location = GOOGLE_CLOUD_LOCATION) {
  const client = new GoogleGenAI({
    vertexai: true,
    project: projectId,
    location: location,
  });

  const response = await client.models.generateContentStream({
    model: 'gemini-2.5-flash-image',
    contents: 'Generate an image of the Eiffel tower with fireworks in the background.',
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
    },
  });

  const generatedFileNames = [];
  let imageIndex = 0;

  for await (const chunk of response) {
    const text = chunk.text;
    const data = chunk.data;

    if (text) {
      console.debug(text);
    } else if (data) {
      const fileName = `generate_content_streaming_image_${imageIndex++}.png`;
      console.debug(`Writing response image to file: ${fileName}.`);
      try {
        fs.writeFileSync(fileName, data);
        generatedFileNames.push(fileName);
      } catch (error) {
        console.error(`Failed to write image file ${fileName}:`, error);
      }
    }
  }

  return generatedFileNames;
}
```

#### Java

```java
import com.google.genai.Client;
import com.google.genai.types.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.util.*;
import javax.imageio.ImageIO;

public class ImageGenMmFlashWithText {

  public static void generateContent(String modelId, String outputFile) throws IOException {
    try (Client client = Client.builder().location("global").vertexAI(true).build()) {

      GenerateContentConfig contentConfig = GenerateContentConfig.builder()
          .responseModalities("TEXT", "IMAGE")
          .candidateCount(1)
          .safetySettings(
              SafetySetting.builder()
                  .method("PROBABILITY")
                  .category("HARM_CATEGORY_DANGEROUS_CONTENT")
                  .threshold("BLOCK_MEDIUM_AND_ABOVE")
                  .build())
          .build();

      GenerateContentResponse response = client.models.generateContent(
          modelId,
          "Generate an image of the Eiffel tower with fireworks in the background.",
          contentConfig);

      List<Part> parts = response.candidates()
          .flatMap(candidates -> candidates.stream().findFirst())
          .flatMap(Candidate::content)
          .flatMap(Content::parts)
          .orElse(new ArrayList<>());

      for (Part part : parts) {
        if (part.text().isPresent()) {
          System.out.println(part.text().get());
        } else if (part.inlineData().flatMap(Blob::data).isPresent()) {
          BufferedImage image = ImageIO.read(
              new ByteArrayInputStream(part.inlineData().flatMap(Blob::data).get()));
          ImageIO.write(image, "png", new File(outputFile));
        }
      }

      System.out.println("Content written to: " + outputFile);
    }
  }
}
```

#### REST API

```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/gemini-2.5-flash-image:generateContent \
  -d '{
    "contents": {
      "role": "USER",
      "parts": {
        "text": "Create a tutorial explaining how to make a peanut butter and jelly sandwich in three easy steps."
      }
    },
    "generation_config": {
      "response_modalities": ["TEXT", "IMAGE"],
      "image_config": {
        "aspect_ratio": "16:9"
      }
    },
    "safetySettings": {
      "method": "PROBABILITY",
      "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
      "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    }
  }'
```

### Generate Interleaved Images and Text

Generate images alongside text in a single response (e.g., recipe with step-by-step images):

#### Python

```python
from google import genai
from google.genai.types import GenerateContentConfig, Modality
from PIL import Image
from io import BytesIO

client = genai.Client()

response = client.models.generate_content(
    model="gemini-2.5-flash-image",
    contents=(
        "Generate an illustrated recipe for a paella. "
        "Create images to go alongside the text as you generate the recipe"
    ),
    config=GenerateContentConfig(response_modalities=[Modality.TEXT, Modality.IMAGE]),
)

with open("output_folder/paella-recipe.md", "w") as fp:
    for i, part in enumerate(response.candidates[0].content.parts):
        if part.text is not None:
            fp.write(part.text)
        elif part.inline_data is not None:
            image = Image.open(BytesIO(part.inline_data.data))
            image.save(f"output_folder/example-image-{i+1}.png")
            fp.write(f"![image](example-image-{i+1}.png)")
```

### Locale-Aware Image Generation

Generate images that consider your location/context:

#### Python

```python
from google import genai
from google.genai.types import GenerateContentConfig, Modality
from PIL import Image
from io import BytesIO

client = genai.Client()

response = client.models.generate_content(
    model="gemini-2.5-flash-image",
    contents="Generate a photo of a breakfast meal.",
    config=GenerateContentConfig(response_modalities=[Modality.TEXT, Modality.IMAGE]),
)

for part in response.candidates[0].content.parts:
    if part.text:
        print(part.text)
    elif part.inline_data:
        image = Image.open(BytesIO(part.inline_data.data))
        image.save("output_folder/example-breakfast-meal.png")
```

---

## Image Understanding

Gemini 2.5 Flash can analyze and understand images.

### Single Image Understanding

#### Python

```python
from google import genai
from google.genai.types import HttpOptions, Part

client = genai.Client(http_options=HttpOptions(api_version="v1"))

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=[
        "What is shown in this image?",
        Part.from_uri(
            file_uri="gs://cloud-samples-data/generative-ai/image/scones.jpg",
            mime_type="image/jpeg",
        ),
    ],
)

print(response.text)
# Example: "The image shows a flat lay of blueberry scones arranged on parchment paper..."
```

#### Node.js

```javascript
const {GoogleGenAI} = require('@google/genai');

const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
const GOOGLE_CLOUD_LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'global';

async function generateContent(projectId = GOOGLE_CLOUD_PROJECT, location = GOOGLE_CLOUD_LOCATION) {
  const client = new GoogleGenAI({
    vertexai: true,
    project: projectId,
    location: location,
  });

  const image = {
    fileData: {
      fileUri: 'gs://cloud-samples-data/generative-ai/image/scones.jpg',
      mimeType: 'image/jpeg',
    },
  };

  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [image, 'What is shown in this image?'],
  });

  console.log(response.text);
  return response.text;
}
```

#### REST API (Cloud Storage)

```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json; charset=utf-8" \
  https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/global/publishers/google/models/gemini-2.5-flash:generateContent \
  -d '{
    "contents": {
      "role": "USER",
      "parts": [
        {
          "fileData": {
            "fileUri": "gs://cloud-samples-data/generative-ai/image/scones.jpg",
            "mimeType": "image/jpeg"
          }
        },
        {
          "text": "What is shown in this image?"
        }
      ]
    }
  }'
```

#### REST API (Base64 Image Data)

```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json; charset=utf-8" \
  https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/global/publishers/google/models/gemini-2.5-flash:generateContent \
  -d '{
    "contents": {
      "role": "USER",
      "parts": [
        {
          "inlineData": {
            "data": "BASE64_ENCODED_IMAGE_DATA",
            "mimeType": "image/jpeg"
          }
        },
        {
          "text": "What is shown in this image?"
        }
      ]
    }
  }'
```

### Multiple Image Understanding

Send multiple images in a single prompt:

#### Python

```python
from google import genai
from google.genai.types import HttpOptions, Part

client = genai.Client(http_options=HttpOptions(api_version="v1"))

# Read content from GCS
gcs_file_img_path = "gs://cloud-samples-data/generative-ai/image/scones.jpg"

# Read content from a local file
with open("test_data/latte.jpg", "rb") as f:
    local_file_img_bytes = f.read()

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=[
        "Generate a list of all the objects contained in both images.",
        Part.from_uri(file_uri=gcs_file_img_path, mime_type="image/jpeg"),
        Part.from_bytes(data=local_file_img_bytes, mime_type="image/jpeg"),
    ],
)

print(response.text)
```

### Image Tokenization

Images are tokenized as follows:

- **Small images** (≤384px both dimensions): 258 tokens
- **Larger images** (>384px one dimension): Cropped into tiles
  - Each tile size: smallest dimension / 1.5
  - Tile size range: 256px to 768px
  - Each tile resized to 768x768: 258 tokens

### Best Practices for Image Understanding

1. **Single image for text detection**: Use one image per prompt for OCR tasks
2. **Place images before text**: In single-image prompts
3. **Index multiple images**: Use labels like `image 1`, `image 2`, `image 3`
   ```
   image 1
   image 2
   image 3

   Write a blogpost about my day using image 1 and image 2.
   Then, give me ideas for tomorrow based on image 3.
   ```
4. **Use high-resolution images**: Better results with higher quality
5. **Include examples**: Few-shot prompting improves accuracy
6. **Rotate images**: Ensure proper orientation
7. **Avoid blurry images**: Quality matters

### Image Understanding Limitations

- **Content moderation**: Refuses unsafe content
- **Spatial reasoning**: Approximate counts/locations, not precise
- **Medical uses**: Not suitable for medical image interpretation
- **People recognition**: Not for identifying non-celebrities
- **Accuracy**: May hallucinate with low-quality, rotated, or low-res images
- **Handwriting**: May have errors with handwritten text

---

## Parameters & Configuration

### Generation Parameters

#### Temperature
- **Range**: 0.0 - 2.0
- **Default**: 1.0
- **Description**: Controls randomness in token selection
  - Lower (0.0): More deterministic, focused responses
  - Higher (2.0): More creative, diverse responses

#### Top-P
- **Range**: 0.0 - 1.0
- **Default**: 0.95
- **Description**: Nucleus sampling - tokens are selected from most probable to least until sum of probabilities equals top-P

#### Top-K
- **Value**: 64 (fixed)
- **Description**: Samples from top K most probable tokens

#### Candidate Count
- **Range**: 1 - 8
- **Default**: 1
- **Description**: Number of response variations to generate

### Token Limits

- **Maximum Input Tokens**: 1,048,576 (1M tokens)
- **Maximum Output Tokens**: 65,535 (default)

### Safety Settings

Configure content safety filters:

```python
safety_settings=[
    {
        "method": "PROBABILITY",
        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    },
    {
        "category": "HARM_CATEGORY_HATE_SPEECH",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    },
    {
        "category": "HARM_CATEGORY_HARASSMENT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    },
    {
        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    }
]
```

**Threshold Options:**
- `BLOCK_NONE`
- `BLOCK_LOW_AND_ABOVE`
- `BLOCK_MEDIUM_AND_ABOVE`
- `BLOCK_HIGH_AND_ABOVE`

---

## Code Examples

### Basic Text Generation

#### Python

```python
from google import genai
from google.genai.types import HttpOptions

client = genai.Client(http_options=HttpOptions(api_version="v1"))

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="How does AI work?",
)

print(response.text)
```

#### Node.js

```javascript
const {GoogleGenAI} = require('@google/genai');

const client = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: 'global',
});

const response = await client.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: 'How does AI work?',
});

console.log(response.text);
```

#### Java

```java
import com.google.genai.Client;
import com.google.genai.types.*;

public class TextGeneration {
  public static String generateContent(String modelId) {
    try (Client client = Client.builder()
        .location("global")
        .vertexAI(true)
        .httpOptions(HttpOptions.builder().apiVersion("v1").build())
        .build()) {

      GenerateContentResponse response = client.models.generateContent(
          modelId,
          "How does AI work?",
          null);

      System.out.print(response.text());
      return response.text();
    }
  }
}
```

#### REST API

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/global/publishers/google/models/gemini-2.5-flash:generateContent \
  -d '{
    "contents": {
      "role": "user",
      "parts": {
        "text": "Explain how AI works in a few words"
      }
    }
  }'
```

### Code Execution

Enable the model to generate and run Python code:

#### Python

```python
from google import genai
from google.genai.types import (
    HttpOptions,
    Tool,
    ToolCodeExecution,
    GenerateContentConfig,
)

client = genai.Client(http_options=HttpOptions(api_version="v1"))
model_id = "gemini-2.5-flash"

code_execution_tool = Tool(code_execution=ToolCodeExecution())

response = client.models.generate_content(
    model=model_id,
    contents="Calculate 20th fibonacci number. Then find the nearest palindrome to it.",
    config=GenerateContentConfig(
        tools=[code_execution_tool],
        temperature=0,
    ),
)

print("# Code:")
print(response.executable_code)
print("# Outcome:")
print(response.code_execution_result)
```

#### Node.js

```javascript
const {GoogleGenAI} = require('@google/genai');

const client = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: 'global',
});

const response = await client.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: 'What is the sum of the first 50 prime numbers? Generate and run code for the calculation.',
  config: {
    tools: [{codeExecution: {}}],
    temperature: 0,
  },
});

console.debug(response.executableCode);
console.debug(response.codeExecutionResult);
```

### Streaming Responses

Get responses as they're generated:

#### Python

```python
from google import genai

client = genai.Client()

for chunk in client.models.generate_content_stream(
    model="gemini-2.5-flash",
    contents="Write a story about a magic backpack."
):
    print(chunk.text, end="")
```

#### Node.js

```javascript
const response = await client.models.generateContentStream({
  model: 'gemini-2.5-flash',
  contents: 'Write a story about a magic backpack.',
});

for await (const chunk of response) {
  console.log(chunk.text);
}
```

---

## Rate Limits & Quotas

### Dynamic Shared Quota (DSQ)

Gemini 2.5 Flash uses **Dynamic Shared Quota (DSQ)**, which:

- ✅ **No predefined quota limits**
- ✅ **No quota increase requests needed**
- ✅ Dynamically allocates capacity based on real-time availability
- ⚠️ Requests may be queued during high demand periods

**Models using DSQ:**
- `gemini-2.5-flash`
- `gemini-2.5-flash-preview-09-2025`
- `gemini-2.5-flash-image`
- `gemini-live-2.5-flash`
- `gemini-2.5-flash-lite` (Preview)
- `gemini-2.5-pro`

### Rate Limit Recommendations

For **production workloads** requiring guaranteed capacity:
- Use [Provisioned Throughput](https://cloud.google.com/vertex-ai/generative-ai/docs/provisioned-throughput)
- Provides dedicated resources and predictable performance
- Eliminates queueing during high demand

### Batch Prediction

- **No predefined quota limits** for Gemini models
- Access to large, shared pool of resources
- Dynamic allocation based on availability
- Requests may be queued during capacity saturation

### Text Embedding Limits

| Quota | Value |
|-------|-------|
| Embed content input tokens per minute | 5,000,000 |
| Maximum input texts per request | 250 |
| Maximum tokens per request | 20,000 |
| Maximum tokens used per input | 2,048 (first 2,048 tokens) |

### Vertex AI Agent Engine Limits

| Description | Limit |
|-------------|-------|
| Create/delete/update operations per minute | 10 |
| Create/delete/update sessions per minute | 100 |
| Query/StreamQuery per minute | 90 |
| Append event to sessions per minute | 300 |
| Maximum resources | 100 |
| Memory resources operations per minute | 100 |
| Memory Bank operations per minute | 300 |
| Code Execution requests per minute | 1000 |
| Code Execution entities per region | 1000 |
| A2A Agent post requests per minute | 60 |
| A2A Agent get requests per minute | 600 |
| Concurrent BidiStreamQuery connections per minute | 10 |

### Gen AI Evaluation Service Quotas

| Request Quota | Default Quota |
|---------------|---------------|
| Evaluation service requests per minute | 1,000 requests/project/region |
| Online prediction | See model quotas |
| Request timeout | 60 seconds |

---

## Pricing

For detailed pricing information, visit the official [Vertex AI Pricing Page](https://cloud.google.com/vertex-ai/generative-ai/pricing).

### Pricing Model

Gemini 2.5 Flash uses **pay-as-you-go** pricing based on:
- **Input tokens**: Charged per 1,000 tokens
- **Output tokens**: Charged per 1,000 tokens
- **Image inputs**: Charged per image
- **Audio/Video inputs**: Charged based on duration/size

### Cost Optimization Tips

1. **Use appropriate context windows**: Don't send unnecessary context
2. **Optimize token usage**: Be concise in prompts
3. **Batch requests**: Use batch prediction for bulk processing
4. **Consider Provisioned Throughput**: For high-volume, predictable workloads
5. **Monitor usage**: Track token consumption in Google Cloud Console

---

## Supported Regions

### Model Availability (DSQ & Provisioned Throughput)

**Global:**
- `global`

**United States:**
- `us-central1`
- `us-east1`
- `us-east4`
- `us-east5`
- `us-south1`
- `us-west1`
- `us-west4`

**Europe:**
- `europe-central2`
- `europe-north1`
- `europe-southwest1`
- `europe-west1`
- `europe-west4`
- `europe-west8`

### ML Processing Regions

**United States:**
- Multi-region

**Canada:**
- `northamerica-northeast1`+ (Supervised fine-tuning not supported)

**Europe:**
- Multi-region
- `europe-west2`* + (128K context only, no fine-tuning)
- `europe-west3`* + (128K context only, no fine-tuning)
- `europe-west9`* + (128K context only, no fine-tuning)

**Asia Pacific:**
- `asia-northeast1`* + (128K context only, no fine-tuning)
- `asia-northeast3`* + (128K context only, no fine-tuning)
- `asia-south1`* + (128K context only, no fine-tuning)
- `asia-southeast1`+
- `australia-southeast1`* + (128K context only, no fine-tuning)

**Legend:**
- \+ Supervised fine-tuning not supported
- \* Available for 128K context window only, no fine-tuning

For data residency information, see [Data Residency Documentation](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/data-residency).

---

## Security Controls

For comprehensive security information, see [Security Controls Documentation](https://cloud.google.com/vertex-ai/generative-ai/docs/security-controls).

### Key Security Features

- **Data encryption**: At rest and in transit
- **VPC Service Controls**: Network security perimeter
- **IAM integration**: Fine-grained access control
- **Audit logging**: Complete activity tracking
- **CMEK support**: Customer-managed encryption keys
- **Data residency**: Regional data processing options

---

## Supported Languages

Gemini 2.5 Flash supports a wide range of languages. For the complete list, see [Supported Languages Documentation](https://cloud.google.com/vertex-ai/generative-ai/docs/models#expandable-1).

**Best Performance Languages (Image Generation):**
- English (EN)
- Spanish - Mexico (es-MX)
- Japanese (ja-JP)
- Chinese - Simplified (zh-CN)
- Hindi (hi-IN)

---

## Best Practices

### General Best Practices

1. **Context Management**
   - Provide sufficient context without unnecessary information
   - Use system instructions for consistent behavior
   - Structure prompts clearly

2. **Error Handling**
   - Implement retry logic for transient failures
   - Handle rate limiting gracefully
   - Parse and handle safety filter responses

3. **Performance Optimization**
   - Use streaming for long responses
   - Batch similar requests when possible
   - Cache responses when appropriate

4. **Security**
   - Never include sensitive data in prompts
   - Validate and sanitize user inputs
   - Use appropriate IAM roles and permissions
   - Enable audit logging

5. **Monitoring**
   - Track token usage and costs
   - Monitor response quality
   - Set up alerts for errors and anomalies

### Prompt Engineering Best Practices

1. **Be Specific and Clear**
   - Provide detailed instructions
   - Use examples when helpful
   - Define the desired output format

2. **Use System Instructions**
   - Set consistent behavior across conversations
   - Define roles and constraints
   - Establish tone and style

3. **Structure Complex Tasks**
   - Break down into steps
   - Use chain-of-thought prompting
   - Provide intermediate reasoning steps

4. **Leverage Multimodal Capabilities**
   - Combine text with images for richer context
   - Use appropriate MIME types
   - Optimize media file sizes

---

## Limitations

### General Limitations

1. **Knowledge Cutoff**: January 2025 - no information beyond this date
2. **Context Window**: While large (1M tokens), very long contexts may impact performance
3. **Multimodal Processing**:
   - Audio/video processing has duration limits
   - Image count limits per prompt
4. **Real-time Information**: No internet access (unless using Grounding)

### Image Generation Specific

1. **Language Support**: Best with EN, es-MX, ja-JP, zh-CN, hi-IN
2. **No Audio/Video Input**: For image generation tasks
3. **Image Count**: May not generate exact number requested
4. **Text Rendering**: Generate text first, then image with text
5. **Output Consistency**: May stop before completion
6. **Safety Filters**: Blocks potentially unsafe content

### Image Understanding Specific

1. **Content Moderation**: Refuses to process policy-violating images
2. **Spatial Reasoning**: Approximate locations/counts, not precise
3. **Medical Images**: Not suitable for medical diagnosis
4. **People Recognition**: Not designed for identifying non-celebrities
5. **Accuracy Issues**:
   - May hallucinate with low-quality images
   - Struggles with rotated images
   - Errors with handwritten text
   - Poor performance with extremely low resolution

### Production Considerations

1. **Availability**: DSQ means capacity is shared - consider Provisioned Throughput for critical workloads
2. **Latency**: Response times vary based on:
   - Prompt complexity
   - Output length
   - Current system load
3. **Rate Limiting**: Implement backoff strategies
4. **Cost Management**: Monitor token usage closely

---

## Advanced Features

### Function Calling

Enable the model to call external functions:

```python
from google import genai
from google.genai.types import FunctionDeclaration, Tool, GenerateContentConfig

# Define function
get_weather_func = FunctionDeclaration(
    name="get_weather",
    description="Get the weather for a location",
    parameters={
        "type": "object",
        "properties": {
            "location": {"type": "string", "description": "City name"}
        }
    }
)

tool = Tool(function_declarations=[get_weather_func])

client = genai.Client()
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="What's the weather in Paris?",
    config=GenerateContentConfig(tools=[tool])
)
```

### Grounding with Google Search

Connect model responses to real-time information:

```python
from google import genai
from google.genai.types import GenerateContentConfig, GoogleSearch

client = genai.Client()

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="What are the latest developments in AI?",
    config=GenerateContentConfig(
        tools=[{"google_search": {}}]
    )
)
```

### Structured Output

Control output format with JSON schemas:

```python
from google import genai
from google.genai.types import GenerateContentConfig

schema = {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "age": {"type": "integer"},
        "email": {"type": "string"}
    },
    "required": ["name", "age"]
}

client = genai.Client()
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Extract person info: John Doe is 30 years old, email: john@example.com",
    config=GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=schema
    )
)
```

### System Instructions

Set consistent behavior:

```python
from google import genai
from google.genai.types import GenerateContentConfig

client = genai.Client()

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Tell me about Paris",
    config=GenerateContentConfig(
        system_instruction="You are a helpful travel guide. Always be enthusiastic and provide practical tips."
    )
)
```

---

## Troubleshooting

### Common Issues

#### Authentication Errors

**Problem**: `401 Unauthorized` or authentication failures

**Solutions:**
```bash
# Re-authenticate
gcloud auth application-default login

# Verify credentials
gcloud auth list

# Check project configuration
gcloud config get-value project
```

#### Quota Exceeded Errors

**Problem**: Rate limit or quota errors

**Solutions:**
- Implement exponential backoff
- Use Provisioned Throughput for guaranteed capacity
- Batch requests efficiently
- Monitor usage in Cloud Console

#### Safety Filter Blocks

**Problem**: Content blocked by safety filters

**Solutions:**
- Adjust safety thresholds (if appropriate)
- Rephrase prompts to avoid triggering filters
- Review content policy guidelines
- Check `FinishReason` in response

#### Slow Response Times

**Problem**: High latency

**Solutions:**
- Use streaming for long responses
- Optimize prompt length
- Consider regional endpoints
- Check for Provisioned Throughput availability

#### Image Processing Errors

**Problem**: Images not processed correctly

**Solutions:**
- Verify MIME types are correct
- Check image file sizes (max 7 MB)
- Ensure images are in supported formats (PNG, JPEG, WebP)
- Rotate images to proper orientation
- Use higher resolution images

---

## Additional Resources

### Official Documentation
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Gemini API Reference](https://cloud.google.com/vertex-ai/docs/reference)
- [Generative AI on Vertex AI](https://cloud.google.com/vertex-ai/generative-ai/docs)

### SDKs and Libraries
- [Python Gen AI SDK](https://googleapis.github.io/python-genai/)
- [Node.js Gen AI SDK](https://googleapis.github.io/js-genai/)
- [Java Gen AI SDK](https://central.sonatype.com/artifact/com.google.genai/google-genai)
- [Go Gen AI SDK](https://pkg.go.dev/google.golang.org/genai)

### Community and Support
- [Google Cloud Console](https://console.cloud.google.com/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/google-cloud-vertex-ai)
- [Google Cloud Support](https://cloud.google.com/support)
- [Issue Tracker](https://issuetracker.google.com/issues?q=componentid:187204)

### Related Services
- [Vertex AI Studio](https://cloud.google.com/vertex-ai/docs/generative-ai/start/quickstarts/quickstart-multimodal)
- [Vertex AI RAG Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/rag-engine/rag-overview)
- [Vertex AI Agent Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview)
- [Provisioned Throughput](https://cloud.google.com/vertex-ai/generative-ai/docs/provisioned-throughput)

---

## Changelog

**October 10, 2025**: Initial comprehensive documentation compiled from official Google Cloud Vertex AI sources

---

## License

This documentation is compiled from Google Cloud's official documentation, which is licensed under the [Creative Commons Attribution 4.0 License](https://creativecommons.org/licenses/by/4.0/), and code samples are licensed under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0).

For details, see the [Google Developers Site Policies](https://developers.google.com/site-policies).

---

**End of Documentation**
