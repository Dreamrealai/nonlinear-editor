# ElevenLabs Official API Documentation

**API Provider:** ElevenLabs
**Model Provider:** ElevenLabs
**Output Type:** Text-to-Speech (TTS) / Audio
**Last Updated:** October 17, 2025
**API Version:** v1

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Key Management](#api-key-management)
4. [Base URL & Headers](#base-url--headers)
5. [Text-to-Speech API](#text-to-speech-api)
6. [Speech-to-Speech API](#speech-to-speech-api-voice-changer)
7. [Voice Endpoints](#voice-endpoints)
8. [Service Accounts & API Keys](#service-accounts--api-keys)
9. [Request Parameters](#request-parameters)
10. [Output Formats](#output-formats)
11. [Rate Limits](#rate-limits)
12. [Security Best Practices](#security-best-practices)
13. [Code Examples](#code-examples)
14. [Error Handling](#error-handling)
15. [Pricing](#pricing)
16. [Support & Resources](#support--resources)

---

## Overview

ElevenLabs provides a powerful AI audio API for text-to-speech, voice cloning, and speech-to-speech conversion. The platform offers:

- **Premium Text-to-Speech**: Convert text to natural-sounding speech
- **Voice Library**: Access to pre-made voices or clone your own
- **Multiple Languages**: Support for various languages
- **Real-time Streaming**: Low-latency streaming for conversational AI
- **Voice Changer**: Transform existing speech
- **High-Quality Output**: Professional-grade audio generation

**Key Features:**

- RESTful API design
- Streaming and non-streaming modes
- Custom voice creation and cloning
- Flexible output formats
- Comprehensive voice settings
- Enterprise-grade reliability

---

## Authentication

ElevenLabs API uses API key authentication. Every request to the API must include your API key to authenticate and track usage quota.

### Authentication Method

All API requests should include your API key in an `xi-api-key` HTTP header.

**Required Header:**

```http
xi-api-key: YOUR_API_KEY_HERE
```

### Header Format

```http
GET /v1/voices HTTP/1.1
Host: api.elevenlabs.io
xi-api-key: your_api_key_here
Content-Type: application/json
```

### Environment Variable Setup

**Bash/Shell:**

```bash
export ELEVENLABS_API_KEY="your_api_key_here"
```

**Python (.env file):**

```bash
ELEVENLABS_API_KEY=your_api_key_here
```

**Node.js (.env file):**

```bash
ELEVENLABS_API_KEY=your_api_key_here
```

---

## API Key Management

### How to Obtain Your API Key

1. **Create an Account**
   - Visit [elevenlabs.io](https://elevenlabs.io)
   - Sign up for a free or paid account

2. **Access Your Profile**
   - Log in to your account
   - Navigate to your profile settings
   - Find your xi-api-key in the API section

3. **Generate API Keys** (Service Accounts)
   - Go to the [API Key Management Page](https://elevenlabs.io/docs/api-reference/service-accounts/api-keys)
   - Create service account API keys for production use
   - Set custom scopes and credit limits

### API Key Types

#### Personal API Key

- Found in profile settings
- Full access to all account features
- Suitable for development and testing

#### Service Account API Keys

- Created via API or dashboard
- Scoped access control
- Custom credit quotas
- Ideal for production deployments

### API Key Scoping

Each API key can be scoped to:

1. **Scope Restriction**
   - Limit which API endpoints the key can access
   - Restrict to specific operations (e.g., TTS only)

2. **Credit Quota**
   - Define custom credit limits
   - Control usage and costs
   - Prevent unexpected overages

### Create API Key Endpoint

**Endpoint:** `POST /v1/service-accounts/api-keys/create`

**Request Body:**

```json
{
  "name": "Production TTS Key",
  "scopes": ["text-to-speech"],
  "credit_limit": 10000
}
```

**Response:**

```json
{
  "api_key_id": "key_abc123",
  "api_key": "sk_xyz789...",
  "name": "Production TTS Key",
  "scopes": ["text-to-speech"],
  "credit_limit": 10000,
  "created_at": "2025-10-17T12:00:00Z"
}
```

### List API Keys

**Endpoint:** `GET /v1/service-accounts/api-keys/list`

**Response:**

```json
{
  "api_keys": [
    {
      "api_key_id": "key_abc123",
      "name": "Production TTS Key",
      "scopes": ["text-to-speech"],
      "credit_limit": 10000,
      "credits_used": 2450,
      "created_at": "2025-10-17T12:00:00Z"
    }
  ]
}
```

---

## Base URL & Headers

### Base URL

```
https://api.elevenlabs.io
```

### Required Headers

| Header         | Value              | Description           |
| -------------- | ------------------ | --------------------- |
| `xi-api-key`   | Your API key       | Authentication header |
| `Content-Type` | `application/json` | Request body format   |

### Optional Headers

| Header   | Value                     | Description           |
| -------- | ------------------------- | --------------------- |
| `Accept` | `audio/mpeg`, `audio/wav` | Response audio format |

### Example Request Headers

```http
xi-api-key: your_api_key_here
Content-Type: application/json
Accept: audio/mpeg
```

---

## Text-to-Speech API

### Endpoint

**POST** `/v1/text-to-speech/{voice_id}`

**Streaming variant:** `/v1/text-to-speech/{voice_id}/stream`

### Path Parameters

| Parameter  | Type   | Required | Description            |
| ---------- | ------ | -------- | ---------------------- |
| `voice_id` | string | Yes      | ID of the voice to use |

### Request Body

| Parameter                           | Type    | Required | Default                 | Description                   |
| ----------------------------------- | ------- | -------- | ----------------------- | ----------------------------- |
| `text`                              | string  | Yes      | -                       | Text to convert to speech     |
| `model_id`                          | string  | No       | `eleven_monolingual_v1` | TTS model to use              |
| `voice_settings`                    | object  | No       | -                       | Voice configuration           |
| `pronunciation_dictionary_locators` | array   | No       | -                       | Custom pronunciation rules    |
| `seed`                              | integer | No       | random                  | Seed for reproducibility      |
| `previous_text`                     | string  | No       | -                       | Context from previous request |
| `next_text`                         | string  | No       | -                       | Context for next request      |
| `previous_request_ids`              | array   | No       | -                       | IDs for request stitching     |
| `next_request_ids`                  | array   | No       | -                       | IDs for request stitching     |

### Voice Settings Parameters

```json
{
  "stability": 0.5, // 0.0-1.0: Voice consistency
  "similarity_boost": 0.8, // 0.0-1.0: Voice similarity to original
  "style": 0.0, // 0.0-1.0: Style exaggeration
  "use_speaker_boost": true // Boolean: Enhance speaker characteristics
}
```

### Latency Optimization

**Parameter:** `optimize_streaming_latency`

- **Type:** Integer (0-4)
- **Default:** 0
- **Description:** Turn on latency optimizations at some cost of quality

| Value | Description                                |
| ----- | ------------------------------------------ |
| 0     | No optimization (highest quality)          |
| 1     | Light optimization                         |
| 2     | Moderate optimization                      |
| 3     | Strong optimization                        |
| 4     | Maximum optimization (text normalizer off) |

### Privacy Settings

**Parameter:** `enable_logging`

- **Type:** Boolean
- **Default:** true
- **Description:** When false, full privacy mode is used

**Important:**

- Privacy mode disables history features
- Request stitching unavailable
- May only be used by enterprise customers

### Example Request (cURL)

```bash
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM" \
  -H "xi-api-key: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello! This is a test of the ElevenLabs text-to-speech API.",
    "model_id": "eleven_monolingual_v1",
    "voice_settings": {
      "stability": 0.5,
      "similarity_boost": 0.8,
      "style": 0.0,
      "use_speaker_boost": true
    }
  }' \
  --output audio.mp3
```

### Example Request (Streaming)

```bash
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM/stream" \
  -H "xi-api-key: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Streaming audio example with ElevenLabs API.",
    "model_id": "eleven_monolingual_v1",
    "optimize_streaming_latency": 2
  }' \
  --output stream_audio.mp3
```

---

## Speech-to-Speech API (Voice Changer)

Transform existing audio with different voices while preserving the speaking style and emotional delivery.

### Endpoint

**POST** `/v1/speech-to-speech/{voice_id}`

**Streaming variant:** `/v1/speech-to-speech/{voice_id}/stream`

### Path Parameters

| Parameter  | Type   | Required | Description            |
| ---------- | ------ | -------- | ---------------------- |
| `voice_id` | string | Yes      | ID of the target voice |

### Request Body (Multipart Form Data)

| Parameter        | Type   | Required | Default                  | Description                        |
| ---------------- | ------ | -------- | ------------------------ | ---------------------------------- |
| `audio`          | file   | Yes      | -                        | Source audio file (mp3, wav, etc.) |
| `model_id`       | string | No       | `eleven_multilingual_v2` | Model to use                       |
| `voice_settings` | object | No       | -                        | Voice configuration                |

### Example Request (cURL)

```bash
curl -X POST "https://api.elevenlabs.io/v1/speech-to-speech/21m00Tcm4TlvDq8ikWAM" \
  -H "xi-api-key: your_api_key_here" \
  -F "audio=@input.mp3" \
  -F "model_id=eleven_multilingual_v2" \
  --output transformed_audio.mp3
```

### Example Request (Python)

```python
import requests
import os

API_KEY = os.getenv('ELEVENLABS_API_KEY')
VOICE_ID = "21m00Tcm4TlvDq8ikWAM"

url = f"https://api.elevenlabs.io/v1/speech-to-speech/{VOICE_ID}"

headers = {"xi-api-key": API_KEY}

files = {
    'audio': open('input.mp3', 'rb')
}

data = {
    'model_id': 'eleven_multilingual_v2'
}

response = requests.post(url, headers=headers, files=files, data=data)

if response.status_code == 200:
    with open("transformed_audio.mp3", "wb") as f:
        f.write(response.content)
    print("Voice transformation completed!")
else:
    print(f"Error: {response.status_code}")
```

### Use Cases

- **Voice dubbing**: Replace voices in existing audio/video
- **Character voices**: Transform recordings to match character voices
- **Accent modification**: Change accent while preserving content
- **Voice restoration**: Apply clear voice to degraded audio
- **Content localization**: Adapt voices for different markets

---

## Voice Endpoints

### List All Voices

**Endpoint:** `GET /v1/voices`

**Response:**

```json
{
  "voices": [
    {
      "voice_id": "21m00Tcm4TlvDq8ikWAM",
      "name": "Rachel",
      "category": "premade",
      "description": "American female voice",
      "labels": {
        "accent": "american",
        "age": "young",
        "gender": "female"
      },
      "preview_url": "https://..."
    }
  ]
}
```

### Get Voice Details

**Endpoint:** `GET /v1/voices/{voice_id}`

**Response:**

```json
{
  "voice_id": "21m00Tcm4TlvDq8ikWAM",
  "name": "Rachel",
  "category": "premade",
  "description": "American female voice",
  "labels": {
    "accent": "american",
    "age": "young",
    "gender": "female"
  },
  "settings": {
    "stability": 0.5,
    "similarity_boost": 0.75
  },
  "samples": [
    {
      "sample_id": "sample_123",
      "file_name": "sample.mp3",
      "mime_type": "audio/mpeg"
    }
  ]
}
```

### Add Voice (Voice Cloning)

**Endpoint:** `POST /v1/voices/add`

**Request:**

```bash
curl -X POST "https://api.elevenlabs.io/v1/voices/add" \
  -H "xi-api-key: your_api_key_here" \
  -F "name=My Custom Voice" \
  -F "files=@sample1.mp3" \
  -F "files=@sample2.mp3" \
  -F "description=Custom cloned voice"
```

---

## Service Accounts & API Keys

### Create Service Account

Service accounts allow you to manage API keys with specific scopes and credit limits.

**Endpoint:** `POST /v1/service-accounts/create`

### Manage API Keys

**List Keys:**

```bash
curl "https://api.elevenlabs.io/v1/service-accounts/api-keys/list" \
  -H "xi-api-key: your_api_key_here"
```

**Create Key:**

```bash
curl -X POST "https://api.elevenlabs.io/v1/service-accounts/api-keys/create" \
  -H "xi-api-key: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Key",
    "scopes": ["text-to-speech"],
    "credit_limit": 5000
  }'
```

**Delete Key:**

```bash
curl -X DELETE "https://api.elevenlabs.io/v1/service-accounts/api-keys/{key_id}" \
  -H "xi-api-key: your_api_key_here"
```

---

## Request Parameters

### Available Models with Detailed Comparison

| Feature             | eleven_monolingual_v1 | eleven_multilingual_v1 | eleven_multilingual_v2 | eleven_turbo_v2 | eleven_turbo_v2_5 |
| ------------------- | --------------------- | ---------------------- | ---------------------- | --------------- | ----------------- |
| **Languages**       | English only          | 29 languages           | 29 languages           | English only    | 32 languages      |
| **Quality**         | High                  | Medium-High            | High                   | Good            | High              |
| **Latency**         | ~1-2s                 | ~1-2s                  | ~1-2s                  | ~0.3-0.5s       | ~0.25-0.3s        |
| **Best For**        | English content       | Multi-language         | Premium multilingual   | Real-time apps  | Conversational AI |
| **Emotional Range** | High                  | Medium                 | High                   | Medium          | Medium-High       |
| **Character Limit** | 5,000                 | 5,000                  | 5,000                  | 10,000          | 40,000            |
| **Relative Cost**   | Standard              | Standard               | Standard               | Standard        | 50% lower         |
| **Voice Cloning**   | Yes                   | Yes                    | Yes                    | Yes             | Yes               |
| **Released**        | 2023                  | 2023                   | 2024                   | 2024            | 2025              |

### Model Selection Guide

**Choose eleven_monolingual_v1 when:**

- English-only content
- Maximum emotional expression needed
- Audiobooks and storytelling
- Voice quality is top priority

**Choose eleven_multilingual_v1 when:**

- Budget-conscious multi-language projects
- Standard quality acceptable
- Wide language support needed

**Choose eleven_multilingual_v2 when:**

- Premium multi-language content
- Professional video narration
- E-learning in multiple languages
- Best multilingual quality needed

**Choose eleven_turbo_v2 when:**

- Real-time English applications
- Low latency is critical
- Conversational AI and chatbots
- Cost optimization important

**Choose eleven_turbo_v2_5 when:**

- Real-time multilingual applications
- Ultra-low latency required (250-300ms)
- High-volume processing
- Best balance of speed, quality, and cost

### Voice Settings Explained

**Stability (0.0 - 1.0):**

- **Low (0.0-0.3):** More variable, emotional
- **Medium (0.4-0.6):** Balanced
- **High (0.7-1.0):** Very consistent, less variation

**Similarity Boost (0.0 - 1.0):**

- **Low (0.0-0.3):** More creative interpretation
- **Medium (0.4-0.6):** Balanced similarity
- **High (0.7-1.0):** Closest to original voice

**Style (0.0 - 1.0):**

- **Low (0.0):** Neutral delivery
- **High (1.0):** Exaggerated style

**Use Speaker Boost (Boolean):**

- **true:** Enhance speaker characteristics (recommended)
- **false:** Standard processing

---

## Output Formats

### Supported Audio Formats

| Format    | MIME Type     | Quality      | Use Case                    |
| --------- | ------------- | ------------ | --------------------------- |
| **MP3**   | `audio/mpeg`  | Compressed   | Standard use, smaller files |
| **PCM**   | `audio/pcm`   | Uncompressed | High quality, editing       |
| **WAV**   | `audio/wav`   | Uncompressed | Professional production     |
| **μ-law** | `audio/basic` | Compressed   | Telephony                   |

### Specifying Output Format

Use the `output_format` parameter or `Accept` header:

**Via Parameter:**

```json
{
  "text": "Hello world",
  "output_format": "mp3_44100_128"
}
```

**Via Header:**

```http
Accept: audio/wav
```

### Available Output Format Specifications

- `mp3_44100_32` - MP3, 44.1kHz, 32kbps
- `mp3_44100_64` - MP3, 44.1kHz, 64kbps
- `mp3_44100_96` - MP3, 44.1kHz, 96kbps
- `mp3_44100_128` - MP3, 44.1kHz, 128kbps (default)
- `mp3_44100_192` - MP3, 44.1kHz, 192kbps
- `pcm_16000` - PCM, 16kHz
- `pcm_22050` - PCM, 22.05kHz
- `pcm_24000` - PCM, 24kHz
- `pcm_44100` - PCM, 44.1kHz

---

## Rate Limits

### Standard Rate Limits

Rate limits vary by subscription plan. Here are the specific limits:

#### Free Tier

- **Characters per month:** 10,000
- **Concurrent requests:** 2
- **Rate limit:** 10 requests/minute
- **Queue priority:** Standard

#### Starter Plan ($5/month)

- **Characters per month:** 30,000
- **Concurrent requests:** 3
- **Rate limit:** 20 requests/minute
- **Queue priority:** Standard

#### Creator Plan ($22/month)

- **Characters per month:** 100,000
- **Concurrent requests:** 5
- **Rate limit:** 40 requests/minute
- **Queue priority:** Priority

#### Pro Plan ($99/month)

- **Characters per month:** 500,000
- **Concurrent requests:** 10
- **Rate limit:** 100 requests/minute
- **Queue priority:** Priority

#### Scale Plan ($330/month)

- **Characters per month:** 2,000,000
- **Concurrent requests:** 20
- **Rate limit:** 200 requests/minute
- **Queue priority:** Priority

#### Business Plan (Custom)

- **Characters per month:** Custom
- **Concurrent requests:** Custom
- **Rate limit:** Custom (no limits)
- **Queue priority:** Highest
- **SLA:** 99.9% uptime guarantee

### Handling Rate Limits

When rate limits are exceeded, the API returns a `429` status code.

**Response Headers:**

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1697558400
```

**Best Practices:**

1. Implement exponential backoff
2. Monitor rate limit headers
3. Queue requests during high load
4. Use streaming for real-time needs

---

## Security Best Practices

### Protecting Your API Key

#### DO:

- ✅ Store API keys as environment variables
- ✅ Use .env files (add to .gitignore)
- ✅ Rotate keys periodically
- ✅ Use service account keys for production
- ✅ Set appropriate scopes and limits
- ✅ Monitor usage for suspicious activity

#### DON'T:

- ❌ Commit API keys to version control
- ❌ Expose keys in client-side code
- ❌ Share keys publicly
- ❌ Use personal keys in production
- ❌ Hard-code keys in source code
- ❌ Use same key across environments

### Example: Secure Configuration

**Python (.env):**

```python
# .env file (add to .gitignore)
ELEVENLABS_API_KEY=sk_abc123xyz...

# app.py
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv('ELEVENLABS_API_KEY')
```

**Node.js (.env):**

```javascript
// .env file (add to .gitignore)
ELEVENLABS_API_KEY=sk_abc123xyz...

// app.js
require('dotenv').config();
const API_KEY = process.env.ELEVENLABS_API_KEY;
```

### Key Rotation

Regularly rotate API keys to maintain security:

1. Create new API key
2. Update application configuration
3. Deploy updated configuration
4. Delete old API key
5. Verify functionality

---

## Code Examples

### Python Examples

#### Basic Text-to-Speech

```python
import requests
import os

API_KEY = os.getenv('ELEVENLABS_API_KEY')
VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # Rachel

url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"

headers = {
    "xi-api-key": API_KEY,
    "Content-Type": "application/json"
}

data = {
    "text": "Hello! This is a test of the ElevenLabs API.",
    "model_id": "eleven_monolingual_v1",
    "voice_settings": {
        "stability": 0.5,
        "similarity_boost": 0.8,
        "style": 0.0,
        "use_speaker_boost": True
    }
}

response = requests.post(url, headers=headers, json=data)

if response.status_code == 200:
    with open("output.mp3", "wb") as f:
        f.write(response.content)
    print("Audio saved to output.mp3")
else:
    print(f"Error: {response.status_code} - {response.text}")
```

#### Streaming Text-to-Speech

```python
import requests
import os

API_KEY = os.getenv('ELEVENLABS_API_KEY')
VOICE_ID = "21m00Tcm4TlvDq8ikWAM"

url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}/stream"

headers = {
    "xi-api-key": API_KEY,
    "Content-Type": "application/json"
}

data = {
    "text": "This is streaming audio generation.",
    "model_id": "eleven_turbo_v2_5",
    "optimize_streaming_latency": 2
}

response = requests.post(url, headers=headers, json=data, stream=True)

with open("stream_output.mp3", "wb") as f:
    for chunk in response.iter_content(chunk_size=8192):
        if chunk:
            f.write(chunk)

print("Streaming audio saved to stream_output.mp3")
```

#### List Voices

```python
import requests
import os

API_KEY = os.getenv('ELEVENLABS_API_KEY')

url = "https://api.elevenlabs.io/v1/voices"
headers = {"xi-api-key": API_KEY}

response = requests.get(url, headers=headers)
voices = response.json()['voices']

for voice in voices:
    print(f"{voice['name']} ({voice['voice_id']})")
    print(f"  Category: {voice['category']}")
    print(f"  Labels: {voice.get('labels', {})}")
    print()
```

#### Complete Class Implementation

```python
import requests
import os
from typing import Dict, Optional

class ElevenLabsAPI:
    """ElevenLabs TTS API Client"""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('ELEVENLABS_API_KEY')
        self.base_url = "https://api.elevenlabs.io/v1"
        self.headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json"
        }

    def text_to_speech(
        self,
        text: str,
        voice_id: str,
        model_id: str = "eleven_monolingual_v1",
        voice_settings: Optional[Dict] = None,
        output_file: str = "output.mp3"
    ) -> str:
        """Generate speech from text"""

        url = f"{self.base_url}/text-to-speech/{voice_id}"

        default_settings = {
            "stability": 0.5,
            "similarity_boost": 0.8,
            "style": 0.0,
            "use_speaker_boost": True
        }

        data = {
            "text": text,
            "model_id": model_id,
            "voice_settings": voice_settings or default_settings
        }

        response = requests.post(url, headers=self.headers, json=data)
        response.raise_for_status()

        with open(output_file, "wb") as f:
            f.write(response.content)

        return output_file

    def stream_text_to_speech(
        self,
        text: str,
        voice_id: str,
        model_id: str = "eleven_turbo_v2_5",
        optimize_latency: int = 2,
        output_file: str = "stream_output.mp3"
    ) -> str:
        """Generate streaming speech from text"""

        url = f"{self.base_url}/text-to-speech/{voice_id}/stream"

        data = {
            "text": text,
            "model_id": model_id,
            "optimize_streaming_latency": optimize_latency
        }

        response = requests.post(
            url,
            headers=self.headers,
            json=data,
            stream=True
        )
        response.raise_for_status()

        with open(output_file, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)

        return output_file

    def get_voices(self) -> list:
        """List all available voices"""

        url = f"{self.base_url}/voices"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()

        return response.json()['voices']

    def get_voice(self, voice_id: str) -> Dict:
        """Get specific voice details"""

        url = f"{self.base_url}/voices/{voice_id}"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()

        return response.json()


# Usage Example
if __name__ == "__main__":
    client = ElevenLabsAPI()

    # Generate speech
    audio_file = client.text_to_speech(
        text="Hello from ElevenLabs!",
        voice_id="21m00Tcm4TlvDq8ikWAM"
    )
    print(f"Generated: {audio_file}")

    # List voices
    voices = client.get_voices()
    print(f"Available voices: {len(voices)}")
```

### JavaScript/Node.js Examples

#### Basic Text-to-Speech

```javascript
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

async function textToSpeech(text, outputFile = 'output.mp3') {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;

  const headers = {
    'xi-api-key': API_KEY,
    'Content-Type': 'application/json',
  };

  const data = {
    text: text,
    model_id: 'eleven_monolingual_v1',
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.0,
      use_speaker_boost: true,
    },
  };

  try {
    const response = await axios.post(url, data, {
      headers: headers,
      responseType: 'arraybuffer',
    });

    fs.writeFileSync(outputFile, response.data);
    console.log(`Audio saved to ${outputFile}`);
    return outputFile;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
textToSpeech('Hello from ElevenLabs!');
```

#### Streaming Text-to-Speech

```javascript
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

async function streamTextToSpeech(text, outputFile = 'stream_output.mp3') {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`;

  const headers = {
    'xi-api-key': API_KEY,
    'Content-Type': 'application/json',
  };

  const data = {
    text: text,
    model_id: 'eleven_turbo_v2_5',
    optimize_streaming_latency: 2,
  };

  try {
    const response = await axios.post(url, data, {
      headers: headers,
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(outputFile);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`Streaming audio saved to ${outputFile}`);
        resolve(outputFile);
      });
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
streamTextToSpeech('Streaming audio example!');
```

#### Complete Class Implementation

```javascript
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

class ElevenLabsAPI {
  constructor(apiKey = process.env.ELEVENLABS_API_KEY) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    this.headers = {
      'xi-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  async textToSpeech(
    text,
    voiceId,
    modelId = 'eleven_monolingual_v1',
    voiceSettings = null,
    outputFile = 'output.mp3'
  ) {
    const url = `${this.baseUrl}/text-to-speech/${voiceId}`;

    const defaultSettings = {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.0,
      use_speaker_boost: true,
    };

    const data = {
      text: text,
      model_id: modelId,
      voice_settings: voiceSettings || defaultSettings,
    };

    try {
      const response = await axios.post(url, data, {
        headers: this.headers,
        responseType: 'arraybuffer',
      });

      fs.writeFileSync(outputFile, response.data);
      return outputFile;
    } catch (error) {
      throw new Error(`TTS Error: ${error.response?.data || error.message}`);
    }
  }

  async streamTextToSpeech(
    text,
    voiceId,
    modelId = 'eleven_turbo_v2_5',
    optimizeLatency = 2,
    outputFile = 'stream_output.mp3'
  ) {
    const url = `${this.baseUrl}/text-to-speech/${voiceId}/stream`;

    const data = {
      text: text,
      model_id: modelId,
      optimize_streaming_latency: optimizeLatency,
    };

    try {
      const response = await axios.post(url, data, {
        headers: this.headers,
        responseType: 'stream',
      });

      const writer = fs.createWriteStream(outputFile);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(outputFile));
        writer.on('error', reject);
      });
    } catch (error) {
      throw new Error(`Stream Error: ${error.response?.data || error.message}`);
    }
  }

  async getVoices() {
    const url = `${this.baseUrl}/voices`;

    try {
      const response = await axios.get(url, { headers: this.headers });
      return response.data.voices;
    } catch (error) {
      throw new Error(`Get Voices Error: ${error.response?.data || error.message}`);
    }
  }

  async getVoice(voiceId) {
    const url = `${this.baseUrl}/voices/${voiceId}`;

    try {
      const response = await axios.get(url, { headers: this.headers });
      return response.data;
    } catch (error) {
      throw new Error(`Get Voice Error: ${error.response?.data || error.message}`);
    }
  }
}

// Usage Example
(async () => {
  const client = new ElevenLabsAPI();

  // Generate speech
  const audioFile = await client.textToSpeech('Hello from ElevenLabs!', '21m00Tcm4TlvDq8ikWAM');
  console.log(`Generated: ${audioFile}`);

  // List voices
  const voices = await client.getVoices();
  console.log(`Available voices: ${voices.length}`);
})();
```

---

## Error Handling

### Common Error Codes

| Status Code | Error            | Cause              | Solution                  |
| ----------- | ---------------- | ------------------ | ------------------------- |
| **401**     | Unauthorized     | Invalid API key    | Verify API key is correct |
| **400**     | Bad Request      | Invalid parameters | Check request format      |
| **422**     | Validation Error | Invalid input data | Review parameter values   |
| **429**     | Rate Limit       | Too many requests  | Implement rate limiting   |
| **500**     | Server Error     | Internal error     | Retry request             |

### Error Response Format

```json
{
  "detail": {
    "status": "error",
    "message": "Invalid API key"
  }
}
```

### Error Handling Example (Python)

```python
import requests
import time

def text_to_speech_with_retry(text, voice_id, max_retries=3):
    """TTS with automatic retry on failure"""

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "xi-api-key": os.getenv('ELEVENLABS_API_KEY'),
        "Content-Type": "application/json"
    }
    data = {"text": text}

    for attempt in range(max_retries):
        try:
            response = requests.post(url, headers=headers, json=data)
            response.raise_for_status()
            return response.content

        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 401:
                raise ValueError("Invalid API key")
            elif e.response.status_code == 429:
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt
                    print(f"Rate limited. Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    raise
            elif e.response.status_code >= 500:
                if attempt < max_retries - 1:
                    print(f"Server error. Retrying...")
                    time.sleep(2)
                else:
                    raise
            else:
                raise
```

---

## Pricing

### ElevenLabs Pricing Tiers

ElevenLabs offers various pricing plans based on usage needs:

#### Free Tier

- 10,000 characters/month
- 3 custom voices
- All voice effects
- Commercial license
- Basic support

#### Starter Plan

- $5/month or $48/year (20% savings)
- 30,000 characters/month
- 10 custom voices
- All features
- Priority support

#### Creator Plan

- $22/month or $211/year (20% savings)
- 100,000 characters/month
- 30 custom voices
- Commercial license
- Priority support
- Additional features

#### Pro Plan

- $99/month or $950/year (20% savings)
- 500,000 characters/month
- 160 custom voices
- All features
- Priority support
- API access
- Advanced features

#### Scale Plan

- $330/month or $3,168/year (20% savings)
- 2,000,000 characters/month
- Unlimited custom voices
- Enterprise features
- Dedicated support

#### Business Plan

- Custom pricing
- Custom character quota
- Dedicated account manager
- SLA guarantees
- Custom integrations

### API Usage Costs

- Charged per character processed
- Different rates for different models
- Failed requests (5xx) not charged
- Validation errors (4xx) may be charged

---

## Support & Resources

### Official Documentation

- **Main Docs:** [elevenlabs.io/docs](https://elevenlabs.io/docs)
- **API Reference:** [elevenlabs.io/docs/api-reference](https://elevenlabs.io/docs/api-reference)
- **Authentication:** [elevenlabs.io/docs/api-reference/authentication](https://elevenlabs.io/docs/api-reference/authentication)
- **Developer Quickstart:** [elevenlabs.io/docs/quickstart](https://elevenlabs.io/docs/quickstart)

### Support Channels

- **Discord Community:** Join for community support
- **Email Support:** support@elevenlabs.io
- **Help Center:** [help.elevenlabs.io](https://help.elevenlabs.io)
- **Status Page:** [status.elevenlabs.io](https://status.elevenlabs.io)

### Additional Resources

- **Voice Library:** [elevenlabs.io/voice-library](https://elevenlabs.io/voice-library)
- **Blog:** [elevenlabs.io/blog](https://elevenlabs.io/blog)
- **GitHub:** [github.com/elevenlabs](https://github.com/elevenlabs)
- **Changelog:** Regular updates and new features

### Client Libraries

**Official SDKs:**

- Python: `pip install elevenlabs`
- JavaScript/TypeScript: `npm install elevenlabs`

**Community Libraries:**

- Various language implementations available
- Check GitHub for latest libraries

---

## Changelog

### October 17, 2025

- Initial comprehensive documentation
- Added authentication and API key management details
- Complete code examples in Python and JavaScript
- Added security best practices
- Included all major endpoints
- Added error handling patterns

---

## Quick Reference

### Essential Endpoints

| Operation      | Endpoint                               | Method |
| -------------- | -------------------------------------- | ------ |
| Text-to-Speech | `/v1/text-to-speech/{voice_id}`        | POST   |
| Streaming TTS  | `/v1/text-to-speech/{voice_id}/stream` | POST   |
| List Voices    | `/v1/voices`                           | GET    |
| Get Voice      | `/v1/voices/{voice_id}`                | GET    |
| Create API Key | `/v1/service-accounts/api-keys/create` | POST   |
| List API Keys  | `/v1/service-accounts/api-keys/list`   | GET    |

### Popular Voice IDs

| Voice Name | Voice ID               | Gender | Accent   |
| ---------- | ---------------------- | ------ | -------- |
| Rachel     | `21m00Tcm4TlvDq8ikWAM` | Female | American |
| Adam       | `pNInz6obpgDQGcFmaJgB` | Male   | American |
| Antoni     | `ErXwobaYiN019PkySvjV` | Male   | American |
| Elli       | `MF3mGyEYCl7XYWbV9V6O` | Female | American |
| Josh       | `TxGEqnHWrfWFTfGW9XjX` | Male   | American |

---

**Document Version:** 1.0
**Last Updated:** October 17, 2025
**API Version:** v1
**Source:** [ElevenLabs Official Documentation](https://elevenlabs.io/docs)

---

**End of Documentation**

This documentation provides comprehensive coverage of the ElevenLabs official API, with a focus on authentication, API key management, and complete integration examples.
