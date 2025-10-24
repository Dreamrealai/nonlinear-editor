# Gemini Models - API Reference

Source: https://ai.google.dev/gemini-api/docs/models

## Overview

Gemini is Google's family of multimodal AI models supporting text, images, audio, and video inputs. This document covers the latest Gemini models available through the Gemini API.

## Gemini 2.5 Pro

**Our most advanced model** - Capable of reasoning over complex problems in code, math, and STEM, with long context support.

### Model Details

| Property               | Value                           |
| ---------------------- | ------------------------------- |
| **Model Code**         | `gemini-2.5-pro`                |
| **Input Types**        | Audio, images, video, text, PDF |
| **Output Types**       | Text                            |
| **Input Token Limit**  | 1,048,576                       |
| **Output Token Limit** | 65,536                          |
| **Latest Update**      | June 2025                       |
| **Knowledge Cutoff**   | January 2025                    |

### Capabilities

- ✅ Batch API
- ✅ Caching
- ✅ Code execution
- ✅ Function calling
- ✅ Grounding with Google Maps
- ✅ Search grounding
- ✅ Structured outputs
- ✅ Thinking
- ✅ URL context
- ❌ Audio generation
- ❌ Image generation
- ❌ Live API

### Versions

- **Stable**: `gemini-2.5-pro`

---

## Gemini 2.5 Flash

**Fast and intelligent** - Best price-performance model for large-scale processing, low-latency tasks, and agentic use cases.

### Model Details

| Property               | Value                      |
| ---------------------- | -------------------------- |
| **Model Code**         | `gemini-2.5-flash`         |
| **Input Types**        | Text, images, video, audio |
| **Output Types**       | Text                       |
| **Input Token Limit**  | 1,048,576                  |
| **Output Token Limit** | 65,536                     |
| **Latest Update**      | June 2025                  |
| **Knowledge Cutoff**   | January 2025               |

### Capabilities

- ✅ Batch API
- ✅ Caching
- ✅ Code execution
- ✅ Function calling
- ✅ Grounding with Google Maps
- ✅ Search grounding
- ✅ Structured outputs
- ✅ Thinking
- ✅ URL context
- ❌ Audio generation
- ❌ Image generation
- ❌ Live API

### Versions

- **Stable**: `gemini-2.5-flash`
- **Preview**: `gemini-2.5-flash-preview-09-2025`

---

## Gemini 2.5 Flash Image (NEW!)

**State-of-the-art image model** - Generate and edit images using text and image inputs.

### Model Details

| Property               | Value                    |
| ---------------------- | ------------------------ |
| **Model Code**         | `gemini-2.5-flash-image` |
| **Input Types**        | Images and text          |
| **Output Types**       | Images and text          |
| **Input Token Limit**  | 32,768                   |
| **Output Token Limit** | 32,768                   |
| **Latest Update**      | October 2025             |
| **Knowledge Cutoff**   | June 2025                |

### Capabilities

- ✅ **Image generation** ⭐ NEW!
- ✅ Batch API
- ✅ Caching
- ✅ Structured outputs
- ❌ Audio generation
- ❌ Code execution
- ❌ Function calling
- ❌ Grounding with Google Maps
- ❌ Live API
- ❌ Search grounding
- ❌ Thinking
- ❌ URL context

### Versions

- **Stable**: `gemini-2.5-flash-image`
- **Preview**: `gemini-2.5-flash-image-preview`

### Key Features

1. **Text-to-Image Generation**: Create images from text descriptions
2. **Image Editing**: Modify existing images with text instructions
3. **High Quality**: State-of-the-art image quality
4. **Fast**: Optimized for quick generation
5. **Multimodal**: Combine text and image inputs

---

## Gemini 2.5 Flash Live

**Real-time audio and video** - Interactive conversations with native audio support.

### Model Details

| Property               | Value                                           |
| ---------------------- | ----------------------------------------------- |
| **Model Code**         | `gemini-2.5-flash-native-audio-preview-09-2025` |
| **Input Types**        | Audio, video, text                              |
| **Output Types**       | Audio and text                                  |
| **Input Token Limit**  | 128,000                                         |
| **Output Token Limit** | 8,000                                           |
| **Latest Update**      | September 2025                                  |
| **Knowledge Cutoff**   | January 2025                                    |

### Capabilities

- ✅ **Audio generation** ⭐
- ✅ **Live API** ⭐
- ✅ Function calling
- ✅ Search grounding
- ✅ Thinking
- ❌ Batch API
- ❌ Caching
- ❌ Code execution
- ❌ Grounding with Google Maps
- ❌ Image generation
- ❌ Structured outputs
- ❌ URL context

### Versions

- **Preview**: `gemini-2.5-flash-native-audio-preview-09-2025`
- **Preview**: `gemini-live-2.5-flash-preview` (deprecated Dec 9, 2025)

---

## Gemini 2.5 Flash TTS

**Text-to-Speech** - Generate natural-sounding speech from text.

### Model Details

| Property               | Value                          |
| ---------------------- | ------------------------------ |
| **Model Code**         | `gemini-2.5-flash-preview-tts` |
| **Input Types**        | Text                           |
| **Output Types**       | Audio                          |
| **Input Token Limit**  | 8,000                          |
| **Output Token Limit** | 16,000                         |
| **Latest Update**      | May 2025                       |

### Capabilities

- ✅ **Audio generation** ⭐
- ✅ Batch API
- ❌ All other features

---

## Gemini 2.5 Flash-Lite

**Ultra fast** - Fastest flash model optimized for cost-efficiency and high throughput.

### Model Details

| Property               | Value                          |
| ---------------------- | ------------------------------ |
| **Model Code**         | `gemini-2.5-flash-lite`        |
| **Input Types**        | Text, image, video, audio, PDF |
| **Output Types**       | Text                           |
| **Input Token Limit**  | 1,048,576                      |
| **Output Token Limit** | 65,536                         |
| **Latest Update**      | July 2025                      |
| **Knowledge Cutoff**   | January 2025                   |

### Capabilities

- ✅ Batch API
- ✅ Caching
- ✅ Code execution
- ✅ Function calling
- ✅ Grounding with Google Maps
- ✅ Search grounding
- ✅ Structured outputs
- ✅ Thinking
- ✅ URL context
- ❌ Audio generation
- ❌ Image generation
- ❌ Live API

### Versions

- **Stable**: `gemini-2.5-flash-lite`
- **Preview**: `gemini-2.5-flash-lite-preview-09-2025`

---

## Model Version Patterns

### Stable

Points to a specific stable model that usually doesn't change. Recommended for production.

- Example: `gemini-2.5-flash`

### Preview

Preview model suitable for production with billing enabled and restrictive rate limits. Will be deprecated with at least 2 weeks notice.

- Example: `gemini-2.5-flash-preview-09-2025`

### Latest

Points to the latest release (stable, preview, or experimental). Gets hot-swapped with new releases. 2-week notice before version changes.

- Example: `gemini-flash-latest`

### Experimental

Not suitable for production, more restrictive rate limits. Released for early feedback.

- Availability subject to change without notice

---

## Usage Examples

### Text Generation (Python)

```python
import google.generativeai as genai

genai.configure(api_key='YOUR_API_KEY')

model = genai.GenerativeModel('gemini-2.5-flash')
response = model.generate_content('Explain quantum computing')
print(response.text)
```

### Image Generation with Gemini 2.5 Flash Image (Python)

```python
import google.generativeai as genai

genai.configure(api_key='YOUR_API_KEY')

model = genai.GenerativeModel('gemini-2.5-flash-image')

# Text-to-image
response = model.generate_content('A serene mountain landscape at sunset')

# Save the generated image
if response.parts:
    for part in response.parts:
        if hasattr(part, 'inline_data'):
            with open('generated_image.png', 'wb') as f:
                f.write(part.inline_data.data)
```

### Image Editing (Python)

```python
import google.generativeai as genai
from PIL import Image

genai.configure(api_key='YOUR_API_KEY')

model = genai.GenerativeModel('gemini-2.5-flash-image')

# Load input image
input_image = Image.open('input.jpg')

# Edit image
response = model.generate_content([
    'Add a rainbow in the sky',
    input_image
])
```

### Multimodal Chat (Node.js)

```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI('YOUR_API_KEY');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

const chat = model.startChat({
  history: [],
  generationConfig: {
    maxOutputTokens: 2048,
  },
});

const result = await chat.sendMessage('Hello! What can you help me with?');
console.log(result.response.text());
```

### Function Calling (Python)

```python
import google.generativeai as genai

genai.configure(api_key='YOUR_API_KEY')

# Define function
def get_weather(location: str) -> dict:
    return {"temperature": 72, "condition": "sunny"}

model = genai.GenerativeModel(
    'gemini-2.5-flash',
    tools=[get_weather]
)

response = model.generate_content('What is the weather in San Francisco?')
```

---

## Best Practices

1. **Model Selection**:
   - Use **Gemini 2.5 Pro** for complex reasoning tasks
   - Use **Gemini 2.5 Flash** for balanced speed and quality
   - Use **Gemini 2.5 Flash-Lite** for high-throughput tasks
   - Use **Gemini 2.5 Flash Image** for image generation and editing

2. **Context Length**:
   - Leverage 1M+ token context for large documents
   - Use caching for repeated long contexts

3. **Thinking Mode**:
   - Enable for complex reasoning tasks
   - Provides step-by-step thought process

4. **Structured Outputs**:
   - Use for consistent JSON responses
   - Define schemas for reliable data extraction

5. **Rate Limits**:
   - Use batch API for large-scale processing
   - Implement exponential backoff for retries

---

## Comparison Chart

| Feature       | 2.5 Pro    | 2.5 Flash  | 2.5 Flash Image | 2.5 Flash-Lite |
| ------------- | ---------- | ---------- | --------------- | -------------- |
| **Speed**     | ⚡⚡       | ⚡⚡⚡     | ⚡⚡⚡          | ⚡⚡⚡⚡       |
| **Quality**   | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   | ⭐⭐⭐⭐        | ⭐⭐⭐         |
| **Context**   | 1M+ tokens | 1M+ tokens | 32K tokens      | 1M+ tokens     |
| **Image Gen** | ❌         | ❌         | ✅              | ❌             |
| **Thinking**  | ✅         | ✅         | ❌              | ✅             |
| **Audio**     | ✅ Input   | ✅ Input   | ❌              | ✅ Input       |
| **Video**     | ✅ Input   | ✅ Input   | ❌              | ✅ Input       |

---

## Links

- [Gemini API Quickstart](https://ai.google.dev/gemini-api/docs/quickstart)
- [Get API Key](https://aistudio.google.com/apikey)
- [Cookbook Examples](https://github.com/google-gemini/cookbook)
- [Developer Community](https://discuss.ai.google.dev/c/gemini-api/)
