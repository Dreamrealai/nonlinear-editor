# ElevenLabs Text-to-Speech via Fal.ai - Complete Documentation

**API Provider:** Fal.ai
**Model Provider:** ElevenLabs
**Output Type:** Text-to-Speech (TTS) / Audio
**Last Updated:** October 10, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Available Models](#available-models)
3. [Authentication](#authentication)
4. [Eleven v3 API](#eleven-v3-api)
5. [Turbo v2.5 API](#turbo-v25-api)
6. [Multilingual v2 API](#multilingual-v2-api)
7. [Code Examples](#code-examples)
8. [Pricing](#pricing)
9. [Rate Limits](#rate-limits)
10. [Best Practices](#best-practices)
11. [Error Handling](#error-handling)

---

## Overview

ElevenLabs provides state-of-the-art text-to-speech models via Fal.ai, offering:

- **Eleven v3 (Alpha)**: Most emotionally rich and expressive speech synthesis (70+ languages)
- **Turbo v2.5**: High-speed TTS with 50% lower cost
- **Multilingual v2**: Premium quality with 32 languages

All models are accessible through the Fal.ai platform with simple REST API integration.

---

## Available Models

### Eleven v3 (Recommended for Quality)

**Endpoint:** `fal-ai/elevenlabs/tts/eleven-v3`

**Features:**
- 70+ languages supported
- Advanced audio tags and dialogue mode
- Most emotionally rich output
- Best for: audiobooks, character dialogues, emotional content

**Limitations:**
- Higher latency (not suitable for real-time/conversational use)
- Requires more prompt engineering
- Alpha stage (subject to changes)

**Model ID:** `eleven_v3`

---

### Turbo v2.5 (Recommended for Speed)

**Endpoint:** `fal-ai/elevenlabs/tts/turbo-v2.5`

**Features:**
- Ultra-low latency (~250-300ms)
- 32 languages
- 50% lower cost than Multilingual v2
- 40,000 character limit
- Best for: conversational AI, real-time applications, agents

**Model ID:** `eleven_turbo_v2_5`

---

### Multilingual v2 (Recommended for Balance)

**Endpoint:** `fal-ai/elevenlabs/tts/multilingual-v2`

**Features:**
- 29 languages
- High-quality, emotionally nuanced speech
- 10,000 character limit
- Best for: professional content, video narration, e-learning

**Model ID:** `eleven_multilingual_v2`

---

## Authentication

All Fal.ai ElevenLabs endpoints require authentication using an API Key.

### Setting up Authentication

#### Environment Variable (Recommended)
```bash
export FAL_KEY="your-fal-api-key-here"
```

#### Manual Configuration (JavaScript/TypeScript)
```javascript
import { fal } from "@fal-ai/client";

fal.config({
  credentials: "YOUR_FAL_KEY"
});
```

#### Manual Configuration (Python)
```python
import fal_client

fal_client.config(
    credentials="YOUR_FAL_KEY"
)
```

### Getting Your API Key

1. Create a free account at [fal.ai/login](https://fal.ai/login)
2. Navigate to your dashboard
3. Generate an API key from the keys section

**Security Warning**: Never expose your API key in client-side code.

---

## Eleven v3 API

### Endpoint

`fal-ai/elevenlabs/tts/eleven-v3`

### Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `text` | string | Yes | - | Text to convert to speech (max 3,000 characters) |
| `voice_id` | string | Yes | - | ElevenLabs voice ID |
| `model_id` | string | No | "eleven_v3" | Model identifier |
| `voice_settings` | object | No | - | Voice configuration settings |
| `language_code` | string | No | - | ISO 639-1 language code |

### Voice Settings

```json
{
  "stability": 0.5,           // 0.0-1.0: Voice consistency
  "similarity_boost": 0.75,   // 0.0-1.0: Voice clarity/similarity
  "style": 0.0,               // 0.0-1.0: Style exaggeration
  "use_speaker_boost": true   // Boolean: Enhance speaker characteristics
}
```

### Output Schema

```typescript
{
  audio_url: string;          // URL to download the generated audio
  content_type: string;       // MIME type (audio/mpeg)
  duration_seconds?: number;  // Audio duration
}
```

### Example Request (JavaScript)

```javascript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/elevenlabs/tts/eleven-v3", {
  input: {
    text: "Hello! This is the most emotionally expressive text-to-speech model from ElevenLabs.",
    voice_id: "21m00Tcm4TlvDq8ikWAM", // Rachel voice
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.5,
      use_speaker_boost: true
    },
    language_code: "en"
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      console.log("Processing:", update.logs?.map(l => l.message).join("\n"));
    }
  }
});

console.log("Audio URL:", result.data.audio_url);
```

### Example Request (Python)

```python
import fal_client

result = fal_client.subscribe(
    "fal-ai/elevenlabs/tts/eleven-v3",
    arguments={
        "text": "Hello! This is the most emotionally expressive text-to-speech model.",
        "voice_id": "21m00Tcm4TlvDq8ikWAM",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
            "style": 0.5,
            "use_speaker_boost": True
        },
        "language_code": "en"
    }
)

print("Audio URL:", result["audio_url"])
```

---

## Turbo v2.5 API

### Endpoint

`fal-ai/elevenlabs/tts/turbo-v2.5`

### Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `text` | string | Yes | - | Text to convert to speech (max 40,000 characters) |
| `voice_id` | string | Yes | - | ElevenLabs voice ID |
| `model_id` | string | No | "eleven_turbo_v2_5" | Model identifier |
| `voice_settings` | object | No | - | Voice configuration settings |
| `output_format` | string | No | "mp3_44100_128" | Audio output format |

### Example Request (JavaScript)

```javascript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/elevenlabs/tts/turbo-v2.5", {
  input: {
    text: "This is ultra-fast text-to-speech for real-time applications.",
    voice_id: "21m00Tcm4TlvDq8ikWAM",
    output_format: "mp3_44100_128"
  }
});

console.log("Audio URL:", result.data.audio_url);
```

---

## Multilingual v2 API

### Endpoint

`fal-ai/elevenlabs/tts/multilingual-v2`

### Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `text` | string | Yes | - | Text to convert to speech (max 10,000 characters) |
| `voice_id` | string | Yes | - | ElevenLabs voice ID |
| `model_id` | string | No | "eleven_multilingual_v2" | Model identifier |
| `voice_settings` | object | No | - | Voice configuration settings |
| `language_code` | string | No | - | ISO 639-1 language code |

### Example Request (Python)

```python
import fal_client

result = fal_client.subscribe(
    "fal-ai/elevenlabs/tts/multilingual-v2",
    arguments={
        "text": "Bonjour! Ceci est une synthèse vocale multilingue de haute qualité.",
        "voice_id": "21m00Tcm4TlvDq8ikWAM",
        "language_code": "fr"
    }
)

print("Audio URL:", result["audio_url"])
```

---

## Code Examples

### Complete Implementation (JavaScript/TypeScript)

```javascript
import { fal } from "@fal-ai/client";

// Configure authentication
fal.config({
  credentials: process.env.FAL_KEY
});

async function generateSpeech(text, voiceId, model = "eleven-v3") {
  try {
    const endpoint = `fal-ai/elevenlabs/tts/${model}`;

    const result = await fal.subscribe(endpoint, {
      input: {
        text,
        voice_id: voiceId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          use_speaker_boost: true
        }
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log(`Status: ${update.status}`);
        }
      }
    });

    return {
      audioUrl: result.data.audio_url,
      duration: result.data.duration_seconds
    };
  } catch (error) {
    console.error("Generation failed:", error);
    throw error;
  }
}

// Usage examples
const audiobook = await generateSpeech(
  "Once upon a time in a land far away...",
  "21m00Tcm4TlvDq8ikWAM",
  "eleven-v3"
);

const conversational = await generateSpeech(
  "Hello! How can I help you today?",
  "21m00Tcm4TlvDq8ikWAM",
  "turbo-v2.5"
);

console.log("Audiobook:", audiobook.audioUrl);
console.log("Conversational:", conversational.audioUrl);
```

### Queue Management (Python)

```python
import fal_client
import time

def generate_speech_async(text, voice_id, model="eleven-v3"):
    """Generate speech asynchronously with status checking"""

    endpoint = f"fal-ai/elevenlabs/tts/{model}"

    # Submit request
    handler = fal_client.submit(
        endpoint,
        arguments={
            "text": text,
            "voice_id": voice_id,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
                "use_speaker_boost": True
            }
        }
    )

    print(f"Request submitted: {handler.request_id}")

    # Monitor progress
    for event in handler.iter_events(with_logs=True):
        if isinstance(event, fal_client.InProgress):
            print(f"Status: {event.logs}")

    # Get result
    result = handler.get()
    return result["audio_url"]

# Usage
audio_url = generate_speech_async(
    "This is an asynchronous speech generation example.",
    "21m00Tcm4TlvDq8ikWAM",
    "multilingual-v2"
)

print(f"Generated audio: {audio_url}")
```

### Error Handling with Retry Logic

```python
import fal_client
import time

def generate_speech_with_retry(text, voice_id, model="turbo-v2.5", max_retries=3):
    """Generate speech with automatic retry on failure"""

    for attempt in range(max_retries):
        try:
            result = fal_client.subscribe(
                f"fal-ai/elevenlabs/tts/{model}",
                arguments={
                    "text": text,
                    "voice_id": voice_id
                }
            )
            return result["audio_url"]

        except fal_client.RateLimitError as e:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # Exponential backoff
                print(f"Rate limited. Retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                raise

        except fal_client.ValidationError as e:
            print(f"Invalid input: {e}")
            raise

        except Exception as e:
            if attempt < max_retries - 1:
                print(f"Error: {e}. Retrying...")
                time.sleep(1)
            else:
                raise

# Usage
audio_url = generate_speech_with_retry(
    "This example includes error handling and retry logic.",
    "21m00Tcm4TlvDq8ikWAM"
)
```

---

## Pricing

### Model Pricing Comparison

| Model | Character Limit | Relative Cost | Best For |
|-------|----------------|---------------|----------|
| **Eleven v3** | 3,000 | Standard | Emotional, expressive content |
| **Turbo v2.5** | 40,000 | 50% lower | Real-time, conversational |
| **Multilingual v2** | 10,000 | Standard | Professional content |

**Pricing Model:**
- Pay-per-use, no subscription required
- Charged per character processed
- Failed requests (5xx errors) not charged
- Validation errors (422) are charged

---

## Rate Limits

### Standard Limits

- **Concurrent Tasks**: 10 per user (across all Fal.ai endpoints)
- **No specific rate limits**: Dynamically managed

### Best Practices

1. Implement exponential backoff for retries
2. Use queue API for long-running requests
3. Monitor request status before submitting new requests
4. Batch similar requests when possible

---

## Best Practices

### Model Selection

**Choose Eleven v3 when:**
- Emotional expression is critical
- Audiobook or narrative content
- Character dialogues with distinct emotions
- Quality is more important than speed

**Choose Turbo v2.5 when:**
- Real-time applications
- Conversational AI/chatbots
- High-volume processing
- Cost optimization is important

**Choose Multilingual v2 when:**
- Professional content production
- Video narration
- E-learning materials
- Balance of quality and speed needed

### Prompt Engineering

1. **Text Formatting**: Use proper punctuation for natural pauses
2. **Emphasis**: Use capitalization or punctuation for emphasis
3. **Pauses**: Use commas, periods, and ellipses for timing
4. **Multiple Languages**: Specify `language_code` for best results

### Voice Selection

Popular voices:
- **Rachel** (`21m00Tcm4TlvDq8ikWAM`): American female, clear
- **Adam** (`pNInz6obpgDQGcFmaJgB`): American male, deep
- **Antoni** (`ErXwobaYiN019PkySvjV`): American male, warm

Browse all voices at [ElevenLabs Voice Library](https://elevenlabs.io/voice-library)

### Performance Optimization

1. **Cache Results**: Store generated audio for repeated content
2. **Batch Processing**: Submit multiple requests in parallel
3. **Use Webhooks**: For asynchronous processing
4. **Optimize Text**: Remove unnecessary formatting

---

## Error Handling

### Common Errors

#### 422 Validation Error
**Cause**: Invalid input parameters

```javascript
// Check character limits
if (text.length > 3000 && model === "eleven-v3") {
  throw new Error("Text exceeds 3,000 character limit for Eleven v3");
}

// Validate voice_id
if (!voice_id) {
  throw new Error("voice_id is required");
}
```

#### 429 Rate Limit Error
**Cause**: Too many concurrent requests

```javascript
async function retryWithBackoff(fn, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000;
        console.log(`Rate limited. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

#### 500 Server Error
**Cause**: Internal server error (not charged)

```python
try:
    result = fal_client.subscribe(endpoint, arguments=args)
except fal_client.ServerError as e:
    print("Server error, retrying...")
    time.sleep(5)
    result = fal_client.subscribe(endpoint, arguments=args)
```

---

## Additional Resources

### Official Documentation
- [Fal.ai Documentation](https://fal.ai/docs)
- [ElevenLabs Eleven v3](https://fal.ai/models/fal-ai/elevenlabs/tts/eleven-v3)
- [ElevenLabs Turbo v2.5](https://fal.ai/models/fal-ai/elevenlabs/tts/turbo-v2.5)
- [ElevenLabs Multilingual v2](https://fal.ai/models/fal-ai/elevenlabs/tts/multilingual-v2)
- [ElevenLabs Voice Library](https://elevenlabs.io/voice-library)

### Support
- **Email**: support@fal.ai
- **Discord**: [Join Fal.ai Community](https://discord.gg/fal-ai)
- **Status**: [status.fal.ai](https://status.fal.ai/)

### Client Libraries
- **JavaScript/TypeScript**: [@fal-ai/client](https://www.npmjs.com/package/@fal-ai/client)
- **Python**: [fal-client](https://pypi.org/project/fal-client/)

---

## Changelog

### October 10, 2025
- Initial documentation for ElevenLabs TTS via Fal.ai
- Added Eleven v3, Turbo v2.5, and Multilingual v2 endpoints
- Comprehensive code examples in JavaScript and Python
- Best practices and error handling patterns

---

**End of Documentation**

This documentation covers the ElevenLabs text-to-speech models available through Fal.ai, focusing on the v3 endpoint as the latest and most advanced option.
