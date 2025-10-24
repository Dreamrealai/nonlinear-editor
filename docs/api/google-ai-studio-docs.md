# Google AI Studio / Gemini API Documentation

Comprehensive documentation for the Gemini API extracted from official Google AI documentation.

Last Updated: October 23, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Models](#models)
4. [API Reference](#api-reference)
5. [Text Generation](#text-generation)
6. [Multimodal Capabilities](#multimodal-capabilities)
7. [Chat and Multi-turn Conversations](#chat-and-multi-turn-conversations)
8. [Request/Response Formats](#requestresponse-formats)
9. [Configuration Parameters](#configuration-parameters)
10. [Rate Limits and Quotas](#rate-limits-and-quotas)
11. [Error Handling](#error-handling)
12. [Best Practices](#best-practices)

---

## Overview

The Gemini API provides access to Google's most advanced AI models including:

- **Gemini 2.5 Pro**: State-of-the-art thinking model for complex reasoning
- **Gemini 2.5 Flash**: Best balance of price and performance with 1M token context
- **Gemini 2.5 Flash-Lite**: Fastest and most cost-efficient model
- **Veo 3.1**: State-of-the-art video generation with native audio
- **Gemini 2.5 Flash Image**: Native image generation (Nano Banana)

### Key Features

- Multimodal inputs (text, images, video, audio, PDFs)
- Long context windows (up to 1,048,576 tokens)
- Structured outputs (JSON)
- Function calling and tool use
- Thinking capabilities for complex reasoning
- Streaming responses
- Context caching
- Search grounding

---

## Authentication

### API Key Authentication

All requests to the Gemini API require an API key passed in the `x-goog-api-key` header.

#### Getting an API Key

1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Create a new project or import an existing Google Cloud project
3. Generate an API key

#### Setting API Key as Environment Variable

**Linux/macOS (Bash):**

```bash
export GEMINI_API_KEY=<YOUR_API_KEY_HERE>
source ~/.bashrc
```

**macOS (Zsh):**

```bash
export GEMINI_API_KEY=<YOUR_API_KEY_HERE>
source ~/.zshrc
```

**Windows:**

1. Search for "Environment Variables"
2. Click "Environment Variables" button
3. Add new variable: `GEMINI_API_KEY` with your key value

#### Providing API Key Explicitly

**Python:**

```python
from google import genai

client = genai.Client(api_key="YOUR_API_KEY")

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Explain how AI works"
)
print(response.text)
```

**JavaScript:**

```javascript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: 'YOUR_API_KEY' });

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: 'Explain how AI works',
});
console.log(response.text);
```

**Go:**

```go
client, err := genai.NewClient(ctx, &genai.ClientConfig{
    APIKey: "YOUR_API_KEY",
    Backend: genai.BackendGeminiAPI,
})
```

**REST:**

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{
    "contents": [{
        "parts": [{
            "text": "Explain how AI works"
        }]
    }]
  }'
```

### Security Best Practices

**Critical Security Rules:**

- Never commit API keys to source control
- Never expose API keys on the client-side
- Do not use keys in production web or mobile apps

**Best Practices:**

- Use server-side calls with API keys
- Use ephemeral tokens for client-side access (Live API only)
- Add API key restrictions to limit permissions
- Treat API keys like passwords

---

## Models

### Gemini 2.5 Pro

Our most advanced thinking model for complex reasoning.

| Property           | Value                           |
| ------------------ | ------------------------------- |
| Model Code         | `gemini-2.5-pro`                |
| Input Token Limit  | 1,048,576                       |
| Output Token Limit | 65,536                          |
| Supported Inputs   | Audio, images, video, text, PDF |
| Output             | Text                            |
| Knowledge Cutoff   | January 2025                    |
| Latest Update      | June 2025                       |

**Capabilities:**

- Audio generation: Not supported
- Batch API: Supported
- Caching: Supported
- Code execution: Supported
- Function calling: Supported
- Grounding with Google Maps: Supported
- Image generation: Not supported
- Live API: Not supported
- Search grounding: Supported
- Structured outputs: Supported
- Thinking: Supported
- URL context: Supported

### Gemini 2.5 Flash

Best model for price-performance with well-rounded capabilities.

| Property           | Value                      |
| ------------------ | -------------------------- |
| Model Code         | `gemini-2.5-flash`         |
| Input Token Limit  | 1,048,576                  |
| Output Token Limit | 65,536                     |
| Supported Inputs   | Text, images, video, audio |
| Output             | Text                       |
| Knowledge Cutoff   | January 2025               |
| Latest Update      | June 2025                  |

**Capabilities:**

- Audio generation: Not supported
- Batch API: Supported
- Caching: Supported
- Code execution: Supported
- Function calling: Supported
- Grounding with Google Maps: Supported
- Image generation: Not supported
- Live API: Not supported
- Search grounding: Supported
- Structured outputs: Supported
- Thinking: Supported
- URL context: Supported

### Gemini 2.5 Flash-Lite

Fastest flash model optimized for cost-efficiency and high throughput.

| Property           | Value                          |
| ------------------ | ------------------------------ |
| Model Code         | `gemini-2.5-flash-lite`        |
| Input Token Limit  | 1,048,576                      |
| Output Token Limit | 65,536                         |
| Supported Inputs   | Text, image, video, audio, PDF |
| Output             | Text                           |
| Knowledge Cutoff   | January 2025                   |
| Latest Update      | July 2025                      |

### Gemini 2.5 Flash Image

Highly effective image generation model (Nano Banana).

| Property           | Value                    |
| ------------------ | ------------------------ |
| Model Code         | `gemini-2.5-flash-image` |
| Input Token Limit  | 32,768                   |
| Output Token Limit | 32,768                   |
| Supported Inputs   | Images and text          |
| Output             | Images and text          |
| Knowledge Cutoff   | June 2025                |
| Latest Update      | October 2025             |

### Previous Generation Models

**Gemini 2.0 Flash:**

- Model Code: `gemini-2.0-flash`
- Input Token Limit: 1,048,576
- Output Token Limit: 8,192
- Knowledge Cutoff: August 2024

**Gemini 2.0 Flash-Lite:**

- Model Code: `gemini-2.0-flash-lite`
- Input Token Limit: 1,048,576
- Output Token Limit: 8,192
- Knowledge Cutoff: August 2024

### Model Version Patterns

**Stable:** Points to a specific stable model (e.g., `gemini-2.5-flash`)

- Recommended for production
- Usually doesn't change

**Preview:** Preview model for production use (e.g., `gemini-2.5-flash-preview-09-2025`)

- Has billing enabled
- May have restrictive rate limits
- Deprecated with at least 2 weeks notice

**Latest:** Points to the latest release (e.g., `gemini-flash-latest`)

- Can be stable, preview, or experimental
- Hot-swapped with every new release
- 2-week notice before version change

**Experimental:** Experimental model (e.g., `gemini-2.0-flash-exp`)

- Not suitable for production
- More restrictive rate limits
- Availability subject to change

---

## API Reference

### Primary Endpoints

1. **Standard Content Generation (`generateContent`)**
   - REST endpoint that returns full response in single package
   - Best for non-interactive tasks
   - Endpoint: `POST /v1beta/models/{model}:generateContent`

2. **Streaming Content Generation (`streamGenerateContent`)**
   - Uses Server-Sent Events (SSE)
   - Pushes response chunks as generated
   - Better for interactive applications
   - Endpoint: `POST /v1beta/models/{model}:streamGenerateContent?alt=sse`

3. **Live API (`BidiGenerateContent`)**
   - Stateful WebSocket-based API
   - Bi-directional streaming
   - Real-time conversational use cases

4. **Batch Mode (`batchGenerateContent`)**
   - Submit batches of `generateContent` requests
   - REST endpoint

5. **Embeddings (`embedContent`)**
   - Generate text embedding vectors
   - REST endpoint

6. **Gen Media APIs**
   - Imagen for image generation
   - Veo for video generation

### Base URL

```
https://generativelanguage.googleapis.com/v1beta/
```

---

## Text Generation

### Basic Text Generation

**Python:**

```python
from google import genai

client = genai.Client()

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="How does AI work?"
)
print(response.text)
```

**JavaScript:**

```javascript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({});

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: 'How does AI work?',
});
console.log(response.text);
```

**Go:**

```go
result, _ := client.Models.GenerateContent(
    ctx,
    "gemini-2.5-flash",
    genai.Text("Explain how AI works"),
    nil,
)
fmt.Println(result.Text())
```

### Thinking with Gemini 2.5

2.5 Flash and Pro models have "thinking" enabled by default for enhanced quality. This may increase token usage and latency.

**Disable Thinking (Python):**

```python
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="How does AI work?",
    config=types.GenerateContentConfig(
        thinking_config=types.ThinkingConfig(thinking_budget=0)
    )
)
```

**Disable Thinking (JavaScript):**

```javascript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: 'How does AI work?',
  config: {
    thinkingConfig: {
      thinkingBudget: 0,
    },
  },
});
```

### System Instructions

Guide model behavior with system instructions.

**Python:**

```python
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemini-2.5-flash",
    config=types.GenerateContentConfig(
        system_instruction="You are a cat. Your name is Neko."
    ),
    contents="Hello there"
)
```

**JavaScript:**

```javascript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: 'Hello there',
  config: {
    systemInstruction: 'You are a cat. Your name is Neko.',
  },
});
```

**REST:**

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "system_instruction": {
      "parts": [{
          "text": "You are a cat. Your name is Neko."
      }]
    },
    "contents": [{
        "parts": [{
            "text": "Hello there"
        }]
    }]
  }'
```

### Streaming Responses

**Python:**

```python
from google import genai

client = genai.Client()

response = client.models.generate_content_stream(
    model="gemini-2.5-flash",
    contents=["Explain how AI works"]
)
for chunk in response:
    print(chunk.text, end="")
```

**JavaScript:**

```javascript
const response = await ai.models.generateContentStream({
  model: 'gemini-2.5-flash',
  contents: 'Explain how AI works',
});

for await (const chunk of response) {
  console.log(chunk.text);
}
```

**REST:**

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  --no-buffer \
  -d '{
    "contents": [{
        "parts": [{
            "text": "Explain how AI works"
        }]
    }]
  }'
```

---

## Multimodal Capabilities

### Image Understanding

Gemini models support native image processing for:

- Image captioning
- Visual question answering
- Object detection
- Image segmentation
- Classification

#### Supported Image Formats

- PNG: `image/png`
- JPEG: `image/jpeg`
- WEBP: `image/webp`
- HEIC: `image/heic`
- HEIF: `image/heif`

#### Passing Inline Image Data

**Python:**

```python
from google import genai
from google.genai import types

with open('path/to/image.jpg', 'rb') as f:
    image_bytes = f.read()

client = genai.Client()
response = client.models.generate_content(
    model='gemini-2.5-flash',
    contents=[
        types.Part.from_bytes(
            data=image_bytes,
            mime_type='image/jpeg'
        ),
        'Caption this image.'
    ]
)
print(response.text)
```

**JavaScript:**

```javascript
import * as fs from 'node:fs';

const base64ImageFile = fs.readFileSync('path/to/image.jpg', {
  encoding: 'base64',
});

const contents = [
  {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64ImageFile,
    },
  },
  { text: 'Caption this image.' },
];

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: contents,
});
```

#### Using File API for Images

**Python:**

```python
from google import genai

client = genai.Client()

my_file = client.files.upload(file="path/to/sample.jpg")

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=[my_file, "Caption this image."]
)
print(response.text)
```

**JavaScript:**

```javascript
const myfile = await ai.files.upload({
  file: 'path/to/sample.jpg',
  config: { mimeType: 'image/jpeg' },
});

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: createUserContent([
    createPartFromUri(myfile.uri, myfile.mimeType),
    'Caption this image.',
  ]),
});
```

#### Multiple Images

**Python:**

```python
from google import genai
from google.genai import types

client = genai.Client()

# Upload first image
uploaded_file = client.files.upload(file="path/to/image1.jpg")

# Prepare second image as inline data
with open("path/to/image2.png", 'rb') as f:
    img2_bytes = f.read()

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=[
        "What is different between these two images?",
        uploaded_file,
        types.Part.from_bytes(
            data=img2_bytes,
            mime_type='image/png'
        )
    ]
)
```

### Object Detection

Gemini 2.0+ models detect objects and provide bounding box coordinates (normalized to [0, 1000]).

**Python:**

```python
from google import genai
from google.genai import types
from PIL import Image
import json

client = genai.Client()
prompt = "Detect all prominent items in the image. The box_2d should be [ymin, xmin, ymax, xmax] normalized to 0-1000."

image = Image.open("/path/to/image.png")

config = types.GenerateContentConfig(
    response_mime_type="application/json"
)

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=[image, prompt],
    config=config
)

width, height = image.size
bounding_boxes = json.loads(response.text)

# Convert normalized coordinates to absolute
for bounding_box in bounding_boxes:
    abs_y1 = int(bounding_box["box_2d"][0]/1000 * height)
    abs_x1 = int(bounding_box["box_2d"][1]/1000 * width)
    abs_y2 = int(bounding_box["box_2d"][2]/1000 * height)
    abs_x2 = int(bounding_box["box_2d"][3]/1000 * width)
```

### Segmentation

Gemini 2.5+ models provide segmentation masks with contours.

Response includes:

- **box_2d**: Bounding box `[y0, x0, y1, x1]` with normalized coordinates (0-1000)
- **label**: Object identifier
- **mask**: Base64 encoded PNG probability map (0-255)

### Image File Limits

- Maximum 3,600 image files per request (Gemini 2.5/2.0/1.5)

### Token Calculation

**Gemini 1.5 Flash/Pro:**

- 258 tokens if both dimensions ≤ 384 pixels
- Larger images tiled (min 256px, max 768px)
- Each tile costs 258 tokens

**Gemini 2.0/2.5 Flash/Pro:**

- 258 tokens if both dimensions ≤ 384 pixels
- Larger images tiled into 768x768 pixel tiles
- Each tile costs 258 tokens

### Best Practices for Images

- Verify images are correctly rotated
- Use clear, non-blurry images
- Place text prompt after image in contents array for single images

---

## Chat and Multi-turn Conversations

### Creating a Chat Session

**Python:**

```python
from google import genai

client = genai.Client()
chat = client.chats.create(model="gemini-2.5-flash")

response = chat.send_message("I have 2 dogs in my house.")
print(response.text)

response = chat.send_message("How many paws are in my house?")
print(response.text)

# View history
for message in chat.get_history():
    print(f'role - {message.role}: {message.parts[0].text}')
```

**JavaScript:**

```javascript
const chat = ai.chats.create({
  model: 'gemini-2.5-flash',
  history: [
    {
      role: 'user',
      parts: [{ text: 'Hello' }],
    },
    {
      role: 'model',
      parts: [{ text: 'Great to meet you. What would you like to know?' }],
    },
  ],
});

const response1 = await chat.sendMessage({
  message: 'I have 2 dogs in my house.',
});
console.log(response1.text);

const response2 = await chat.sendMessage({
  message: 'How many paws are in my house?',
});
console.log(response2.text);
```

**Go:**

```go
history := []*genai.Content{
    genai.NewContentFromText("Hi! I have 2 dogs in my house.", genai.RoleUser),
    genai.NewContentFromText("Great to meet you. What would you like to know?", genai.RoleModel),
}

chat, _ := client.Chats.Create(ctx, "gemini-2.5-flash", nil, history)
res, _ := chat.SendMessage(ctx, genai.Part{Text: "How many paws are in my house?"})
```

**REST:**

```bash
curl https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{
    "contents": [
      {
        "role": "user",
        "parts": [{"text": "Hello"}]
      },
      {
        "role": "model",
        "parts": [{"text": "Great to meet you. What would you like to know?"}]
      },
      {
        "role": "user",
        "parts": [{"text": "I have two dogs in my house. How many paws are in my house?"}]
      }
    ]
  }'
```

### Streaming Chat

**Python:**

```python
chat = client.chats.create(model="gemini-2.5-flash")

response = chat.send_message_stream("I have 2 dogs in my house.")
for chunk in response:
    print(chunk.text, end="")

response = chat.send_message_stream("How many paws are in my house?")
for chunk in response:
    print(chunk.text, end="")
```

---

## Request/Response Formats

### Request Body Structure

The request body is a JSON object built from core components:

**Content Object:** Represents a single turn in conversation
**Part Object:** A piece of data within a Content turn
**Blob Object:** Container for raw media bytes and MIME type

**Basic Request Structure:**

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [{ "text": "Hello" }]
    }
  ],
  "generationConfig": {
    "temperature": 1.0,
    "topK": 40,
    "topP": 0.95,
    "maxOutputTokens": 8192
  },
  "systemInstruction": {
    "parts": [{ "text": "You are a helpful assistant" }]
  }
}
```

### Text-only Prompt

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{
    "contents": [{
      "parts": [{
        "text": "Explain how AI works in a single paragraph."
      }]
    }]
  }'
```

### Multimodal Prompt (Text and Image)

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{
    "contents": [{
      "parts": [
        {
          "inline_data": {
            "mime_type": "image/jpeg",
            "data": "BASE64_ENCODED_IMAGE_DATA"
          }
        },
        {"text": "What is in this picture?"}
      ]
    }]
  }'
```

### Response Body Structure

**Standard Mode Response:**

```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "AI works by learning from vast amounts of data..."
          }
        ],
        "role": "model"
      },
      "finishReason": "STOP",
      "index": 0
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 10,
    "candidatesTokenCount": 50,
    "totalTokenCount": 60
  }
}
```

**Streaming Mode Response:**
Each chunk contains a `responseId` tying the full response together:

```json
{
  "candidates": [
    {
      "content": {
        "parts": [{ "text": "The image displays" }],
        "role": "model"
      },
      "index": 0
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 10
  },
  "modelVersion": "gemini-2.5-flash-lite",
  "responseId": "mAitaLmkHPPlz7IPvtfUqQ4"
}
```

---

## Configuration Parameters

### GenerateContentConfig

**Python:**

```python
from google.genai import types

config = types.GenerateContentConfig(
    temperature=0.9,
    top_p=0.95,
    top_k=40,
    max_output_tokens=8192,
    response_mime_type="application/json",
    system_instruction="You are a helpful assistant",
    thinking_config=types.ThinkingConfig(thinking_budget=0)
)
```

**JavaScript:**

```javascript
const config = {
  temperature: 0.9,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: 'application/json',
  systemInstruction: 'You are a helpful assistant',
  thinkingConfig: {
    thinkingBudget: 0,
  },
};
```

### Key Parameters

| Parameter            | Type     | Description                                         | Default         |
| -------------------- | -------- | --------------------------------------------------- | --------------- |
| `temperature`        | float    | Controls randomness (0.0-2.0). Higher = more random | 1.0             |
| `top_p`              | float    | Nucleus sampling threshold (0.0-1.0)                | 0.95            |
| `top_k`              | int      | Top-k sampling parameter                            | 40              |
| `max_output_tokens`  | int      | Maximum tokens in response                          | Model dependent |
| `stop_sequences`     | string[] | Sequences that stop generation                      | []              |
| `response_mime_type` | string   | Output format (text/plain, application/json)        | text/plain      |
| `candidate_count`    | int      | Number of response candidates                       | 1               |

### Temperature Guide

- **0.0-0.3**: Deterministic, factual responses
- **0.4-0.7**: Balanced creativity and consistency
- **0.8-1.0**: Creative, varied responses
- **1.1-2.0**: Highly creative, unpredictable

### Thinking Configuration

For Gemini 2.5 models:

```python
thinking_config=types.ThinkingConfig(
    thinking_budget=0  # 0 = disabled, higher = more thinking
)
```

---

## Rate Limits and Quotas

### Free Tier Limits

**Requests per minute (RPM):**

- Gemini 2.5 Flash: 15 RPM
- Gemini 2.5 Pro: 2 RPM

**Tokens per minute (TPM):**

- Varies by model
- Check [Google AI Studio](https://aistudio.google.com/) for current limits

**Daily limits:**

- 50 requests per day (free tier)

### Paid Tier

Higher limits available with billing enabled. Visit Google Cloud Console to enable billing and increase quotas.

### File Upload Limits

- Maximum file size: Varies by file type
- Maximum 3,600 images per request
- Video duration limits vary by model

---

## Error Handling

### Common HTTP Status Codes

| Status | Meaning                                 |
| ------ | --------------------------------------- |
| 200    | Success                                 |
| 400    | Bad Request - Invalid parameters        |
| 401    | Unauthorized - Invalid API key          |
| 403    | Forbidden - Insufficient permissions    |
| 429    | Too Many Requests - Rate limit exceeded |
| 500    | Internal Server Error                   |
| 503    | Service Unavailable                     |

### Error Response Format

```json
{
  "error": {
    "code": 400,
    "message": "Invalid argument provided",
    "status": "INVALID_ARGUMENT",
    "details": [
      {
        "@type": "type.googleapis.com/google.rpc.BadRequest",
        "fieldViolations": [
          {
            "field": "contents",
            "description": "contents is required"
          }
        ]
      }
    ]
  }
}
```

### Safety Ratings

Responses may include safety ratings:

```json
{
  "candidates": [
    {
      "content": {...},
      "safetyRatings": [
        {
          "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
          "probability": "LOW"
        }
      ],
      "finishReason": "SAFETY"
    }
  ]
}
```

**Safety Categories:**

- `HARM_CATEGORY_HARASSMENT`
- `HARM_CATEGORY_HATE_SPEECH`
- `HARM_CATEGORY_SEXUALLY_EXPLICIT`
- `HARM_CATEGORY_DANGEROUS_CONTENT`

**Probability Levels:**

- `NEGLIGIBLE`
- `LOW`
- `MEDIUM`
- `HIGH`

### Handling Errors

**Python:**

```python
from google import genai
from google.api_core import exceptions

client = genai.Client()

try:
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents="Hello"
    )
    print(response.text)
except exceptions.InvalidArgument as e:
    print(f"Invalid argument: {e}")
except exceptions.PermissionDenied as e:
    print(f"Permission denied: {e}")
except exceptions.ResourceExhausted as e:
    print(f"Rate limit exceeded: {e}")
except Exception as e:
    print(f"Unexpected error: {e}")
```

**JavaScript:**

```javascript
try {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: 'Hello',
  });
  console.log(response.text);
} catch (error) {
  if (error.status === 429) {
    console.log('Rate limit exceeded');
  } else if (error.status === 401) {
    console.log('Invalid API key');
  } else {
    console.log('Error:', error.message);
  }
}
```

---

## Best Practices

### Prompting Strategies

1. **Be Specific and Clear**
   - Provide detailed instructions
   - Specify desired format and style
   - Include context when necessary

2. **Use System Instructions**
   - Define persona and behavior
   - Set constraints and guidelines
   - Establish output format preferences

3. **Few-shot Prompting**
   - Provide examples of desired inputs/outputs
   - Show format patterns
   - Demonstrate expected behavior

4. **Break Down Complex Tasks**
   - Divide into smaller steps
   - Chain multiple requests if needed
   - Use structured outputs for complex data

### Structured Outputs

Request JSON responses:

**Python:**

```python
from google.genai import types

config = types.GenerateContentConfig(
    response_mime_type="application/json",
    response_schema={
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "age": {"type": "number"}
        }
    }
)

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Extract person info: John is 30 years old",
    config=config
)
```

### Performance Optimization

1. **Use Streaming for Long Responses**
   - Better user experience
   - Start displaying results immediately
   - Reduce perceived latency

2. **Enable Context Caching**
   - Cache frequently used context
   - Reduce token usage
   - Speed up repeated requests

3. **Choose Right Model**
   - Flash-Lite for simple tasks
   - Flash for balanced performance
   - Pro for complex reasoning

4. **Optimize Token Usage**
   - Be concise in prompts
   - Use appropriate max_output_tokens
   - Leverage caching for repeated context

### Security Best Practices

1. **API Key Management**
   - Never commit keys to source control
   - Use environment variables
   - Rotate keys regularly
   - Add restrictions to keys

2. **Input Validation**
   - Validate user inputs
   - Sanitize data before sending
   - Set appropriate content filters

3. **Error Handling**
   - Handle rate limits gracefully
   - Implement retry logic with backoff
   - Log errors for monitoring

4. **Cost Management**
   - Monitor token usage
   - Set budget alerts
   - Implement usage quotas per user

### Content Safety

1. **Safety Settings**
   - Configure appropriate safety filters
   - Handle blocked responses gracefully
   - Provide user feedback for safety blocks

2. **Output Validation**
   - Verify response quality
   - Check for hallucinations
   - Validate structured outputs

3. **User Controls**
   - Allow users to report issues
   - Provide content filtering options
   - Implement feedback mechanisms

---

## Additional Resources

### Official Documentation

- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
- [API Reference](https://ai.google.dev/api)
- [Google AI Studio](https://aistudio.google.com/)

### Community Resources

- [Gemini Cookbook](https://github.com/google-gemini/cookbook)
- [Community Forum](https://discuss.ai.google.dev/c/gemini-api/)

### Code Examples

- [Python Quickstart](https://ai.google.dev/gemini-api/docs/quickstart?lang=python)
- [JavaScript Quickstart](https://ai.google.dev/gemini-api/docs/quickstart?lang=node)
- [Go Quickstart](https://ai.google.dev/gemini-api/docs/quickstart?lang=go)

---

## Summary

The Gemini API provides powerful multimodal AI capabilities with:

- Multiple model variants optimized for different use cases
- Simple API key authentication
- Support for text, images, video, audio, and documents
- Long context windows up to 1M tokens
- Structured output support
- Streaming and batch processing
- Advanced features like function calling, grounding, and thinking

For the best experience:

- Start with Gemini 2.5 Flash for balanced performance
- Use system instructions to guide behavior
- Implement streaming for interactive applications
- Follow security best practices for API keys
- Monitor usage and optimize token consumption

---

**Document Version:** 1.0
**Last Updated:** October 23, 2025
**Source:** Official Google AI Studio / Gemini API Documentation
