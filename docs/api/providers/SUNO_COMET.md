# CometAPI Suno Music Generation API - Comprehensive Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [What is Suno AI?](#what-is-suno-ai)
3. [What is CometAPI?](#what-is-cometapi)
4. [Getting Started](#getting-started)
5. [Authentication](#authentication)
6. [API Base URLs](#api-base-urls)
7. [Core Features](#core-features)
8. [Music Generation API](#music-generation-api)
9. [Lyrics Generation API](#lyrics-generation-api)
10. [Music Extension API](#music-extension-api)
11. [Additional Audio Processing APIs](#additional-audio-processing-apis)
12. [AI Model Versions](#ai-model-versions)
13. [Pricing](#pricing)
14. [Rate Limits](#rate-limits)
15. [Status Codes](#status-codes)
16. [Best Practices](#best-practices)
17. [Code Examples](#code-examples)
18. [Error Handling](#error-handling)
19. [File Storage](#file-storage)
20. [Support](#support)

---

## Introduction

This comprehensive documentation covers the CometAPI integration with Suno AI's music generation capabilities. CometAPI provides a unified API platform that aggregates over 500 AI models from leading providers, including Suno's powerful text-to-music generation API. This guide will help you integrate AI music generation into your applications using either the CometAPI platform or directly through Suno API.

---

## What is Suno AI?

Suno AI is an AI-powered music generation platform that enables users to create original songs—including lyrics, vocals, and instrumentation—simply by providing a text prompt. Launched in late 2023, Suno aims to democratize music creation, making it accessible to everyone, regardless of musical background or expertise.

### Key Capabilities

- **Text-to-Music**: Generate complete songs from text descriptions
- **Lyrics Generation**: Create AI-powered song lyrics independently
- **Vocal & Instrumental**: Support for both vocal and instrumental tracks
- **Multiple Genres**: Create music across various styles and genres
- **Audio Processing**: Extend, cover, and modify existing tracks
- **Vocal Separation**: Extract vocals and instrumental tracks separately
- **Music Videos**: Generate visual content for your audio tracks
- **Multi-language Support**: Generate music in multiple languages

The platform operates by utilizing advanced deep learning models trained on extensive musical datasets. Users input descriptions detailing the desired style, mood, or theme of a song, and Suno processes this information to generate a complete track, typically within 30-40 seconds for streaming, and 2-3 minutes for full downloadable quality.

---

## What is CometAPI?

CometAPI is a unified API platform that aggregates over 500 AI models from leading providers—such as OpenAI's GPT series, Google's Gemini, Anthropic's Claude, Midjourney, Suno, and more—into a single, developer-friendly interface.

### Why Use CometAPI for Suno Integration?

**IMPORTANT NOTE**: CometAPI is an **unofficial third-party API wrapper** for Suno, not an official Suno service.

1. **Unified Interface**: OpenAI-compatible API format for easy integration
2. **Single API Key**: Access multiple AI models with one authentication key
3. **Free Trial**: Get $1 in credits after registration
4. **Consistent Format**: Use the same request/response patterns across all models
5. **Enhanced Support**: 24/7 technical assistance
6. **High Concurrency**: Built for scalable applications
7. **Flexible Pricing**: Pay-as-you-go model with transparent pricing

**Pricing Note**: CometAPI charges approximately **3.6x more** than the official Suno API ($0.144 vs $0.04 per generation). The convenience of a unified API comes at a premium cost.

---

## Getting Started

### Step 1: Create an Account

**For CometAPI:**

1. Visit [https://api.cometapi.com/](https://api.cometapi.com/)
2. Register for a free account
3. Receive $1 in credits immediately upon registration

**For Direct Suno API:**

1. Visit [https://sunoapi.org/](https://sunoapi.org/)
2. Create your account
3. Access the API Key Management page

### Step 2: Obtain Your API Key

**CometAPI:**

- Navigate to your account dashboard
- Generate an API key from the API Keys section
- Store your key securely as an environment variable

**Suno API:**

- Visit the [API Key Management Page](https://sunoapi.org/api-key)
- Generate your authentication credentials
- Keep your API key secure and never share it publicly

### Step 3: Set Up Your Development Environment

#### Install Required Libraries

**Python:**

```bash
# Using OpenAI-compatible library (recommended for CometAPI)
pip install openai

# For direct HTTP requests
pip install requests
```

**Node.js:**

```bash
# Using OpenAI-compatible library (recommended for CometAPI)
npm install openai

# For direct HTTP requests (if needed)
npm install axios
```

---

## Authentication

### CometAPI Authentication

CometAPI uses OpenAI-compatible authentication. You need to configure your client to point to CometAPI's base URL.

**Environment Variables (Recommended):**

```bash
export OPENAI_API_BASE="https://api.cometapi.com"
export OPENAI_API_KEY="sk-YOUR_COMETAPI_KEY"
```

**In-Code Configuration (Python):**

```python
import openai

openai.api_base = "https://api.cometapi.com"
openai.api_key = "sk-YOUR_COMETAPI_KEY"
```

### Suno API Authentication

All Suno API requests require authentication using a Bearer token.

**Header Format:**

```
Authorization: Bearer YOUR_API_KEY
```

**Example cURL:**

```bash
curl -X POST "https://api.sunoapi.org/api/v1/generate" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A peaceful acoustic melody"}'
```

### Security Best Practices

- Never commit API keys to version control (Git)
- Store keys as environment variables
- Rotate keys periodically
- Use separate keys for development and production
- Monitor API usage for suspicious activity
- Never expose keys in client-side code

---

## API Base URLs

### CometAPI

```
https://api.cometapi.com
```

### Suno API

```
https://api.sunoapi.org
```

### Documentation URLs

- CometAPI Docs: [https://apidoc.cometapi.com/](https://apidoc.cometapi.com/)
- Suno API Docs: [https://docs.sunoapi.org/](https://docs.sunoapi.org/)

---

## Core Features

### 1. Music Generation APIs

- **Generate Music**: Create high-quality music from text descriptions
- **Extend Music**: Extend existing music tracks with AI continuation
- **Upload and Cover Audio**: Transform existing audio with new styles
- **Upload and Extend Audio**: Upload and extend your own audio files
- **Add Vocals**: Generate vocal tracks for instrumental music
- **Add Instrumental**: Create instrumental accompaniment for vocals
- **Cover Music**: Reinterpret existing music in different styles

### 2. Lyrics Creation APIs

- **Generate Lyrics**: Create AI-powered lyrics for songs
- **Get Timestamped Lyrics**: Retrieve lyrics with precise timestamps

### 3. Audio Processing APIs

- **Separate Vocals from Music**: Extract vocals and instrumental tracks
- **Convert to WAV Format**: Convert to high-quality WAV format
- **Boost Music Style**: Enhance and refine music styles

### 4. Music Video APIs

- **Create Music Video**: Generate visual music videos from audio tracks

### 5. Utility APIs

- **Get Music Generation Details**: Monitor music generation task status
- **Get Remaining Credits**: Check account credit balance
- **Get Lyrics Generation Details**: Track lyrics generation status
- **Get WAV Conversion Details**: Monitor WAV conversion progress
- **Get Vocal Separation Details**: Check vocal separation status
- **Get Music Video Details**: Track video generation progress
- **Get Cover Details**: Monitor music cover task status

---

## Music Generation API

### Endpoint

**Suno API:**

```
POST https://api.sunoapi.org/api/v1/generate
```

**CometAPI:**

```
POST https://api.cometapi.com/suno/submit/music
```

### Overview

This is the key endpoint for generating AI music. Each request returns exactly **2 songs**.

**Generation Timeline:**

- Stream URL: Available in **30-40 seconds**
- Downloadable song URL: Ready in **2-3 minutes**

### Request Parameters

#### Required Parameters

| Parameter      | Type         | Description                                                                                                                         |
| -------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `customMode`   | boolean      | Enable Custom Mode for advanced settings. `true` = custom mode, `false` = simple mode                                               |
| `instrumental` | boolean      | Generate instrumental-only music without vocals                                                                                     |
| `mv`           | string       | **CometAPI**: Model version using chirp names: `"chirp-v3.0"`, `"chirp-auk"` (v4.5), `"chirp-bluejay"` (v4.5+), `"chirp-crow"` (v5) |
| `model`        | string       | **Suno API Direct**: Model version: `V3_5`, `V4`, `V4_5`, `V4_5PLUS`, `V5`                                                          |
| `callBackUrl`  | string (uri) | URL to receive task completion notifications                                                                                        |

#### Conditional Parameters

When `customMode: true` (Custom Mode):

- If `instrumental: true`: Requires `style` and `title`
- If `instrumental: false`: Requires `style`, `prompt`, and `title`

When `customMode: false` (Non-custom Mode):

- Only `prompt` is required
- Other parameters should be left empty

#### Optional Parameters

| Parameter             | Type   | Range            | Description                                        |
| --------------------- | ------ | ---------------- | -------------------------------------------------- |
| `prompt`              | string | See limits below | Music description or lyrics                        |
| `style`               | string | See limits below | Music style or genre                               |
| `title`               | string | Max 80 chars     | Song title                                         |
| `negativeTags`        | string | -                | Styles to exclude                                  |
| `vocalGender`         | enum   | `m`, `f`         | Preferred vocal gender                             |
| `styleWeight`         | number | 0.00-1.00        | Weight of style guidance (increments of 0.01)      |
| `weirdnessConstraint` | number | 0.00-1.00        | Creative deviation constraint (increments of 0.01) |
| `audioWeight`         | number | 0.00-1.00        | Input audio influence weight (increments of 0.01)  |

**⚠️ IMPORTANT NOTE ON DURATION:**

- **The `duration` parameter is NOT supported** in either CometAPI or official Suno API for music generation.
- Duration is controlled by the AI model and cannot be specified directly in the request.
- Generated music length varies but typically:
  - V3_5 & V4: Up to **4 minutes**
  - V4_5, V4_5PLUS & V5: Up to **8 minutes** (though typical generation is **2-3 minutes**)
- To create longer compositions, use the **Music Extension API** (see [Music Extension API](#music-extension-api) section).

### Character Limits

#### Prompt Length Limits:

- **Custom Mode (customMode: true)**:
  - V3_5 & V4: Maximum 3000 characters
  - V4_5, V4_5PLUS & V5: Maximum 5000 characters
- **Non-custom Mode (customMode: false)**: Maximum 500 characters

#### Style Length Limits:

- V3_5 & V4: Maximum 200 characters
- V4_5, V4_5PLUS & V5: Maximum 1000 characters

#### Title Length Limit:

- Maximum 80 characters

### Request Example (cURL)

**Suno API Direct:**

```bash
curl --request POST \
  --url https://api.sunoapi.org/api/v1/generate \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "prompt": "A calm and relaxing piano track with soft melodies",
    "style": "Classical",
    "title": "Peaceful Piano Meditation",
    "customMode": true,
    "instrumental": true,
    "model": "V4_5",
    "negativeTags": "Heavy Metal, Upbeat Drums",
    "vocalGender": "m",
    "styleWeight": 0.65,
    "weirdnessConstraint": 0.65,
    "audioWeight": 0.65,
    "callBackUrl": "https://api.example.com/callback"
  }'
```

**CometAPI:**

```bash
curl --request POST \
  --url https://api.cometapi.com/suno/submit/music \
  --header 'Authorization: Bearer YOUR_COMETAPI_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "prompt": "A calm and relaxing piano track with soft melodies",
    "style": "Classical",
    "title": "Peaceful Piano Meditation",
    "customMode": true,
    "instrumental": true,
    "mv": "chirp-auk",
    "negativeTags": "Heavy Metal, Upbeat Drums",
    "vocalGender": "m",
    "styleWeight": 0.65,
    "weirdnessConstraint": 0.65,
    "audioWeight": 0.65,
    "callBackUrl": "https://api.example.com/callback"
  }'
```

To check task status with CometAPI:

```bash
curl --request GET \
  --url https://api.cometapi.com/suno/fetch/YOUR_TASK_ID \
  --header 'Authorization: Bearer YOUR_COMETAPI_KEY'
```

### Response Format

**Success Response (200):**

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "5c79****be8e"
  }
}
```

**Task Status Response:**

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "suno_task_abc123",
    "status": "SUCCESS",
    "response": {
      "data": [
        {
          "id": "audio_123",
          "audio_url": "https://example.com/generated-music.mp3",
          "title": "Generated Song",
          "tags": "classical, piano",
          "duration": 180.5,
          "created_at": "2025-10-10T12:00:00Z"
        }
      ]
    }
  }
}
```

### Parameter Usage Guide Summary

1. **Recommendation for First-Time Users**: Start with `customMode: false` and `instrumental: false`, only providing a `prompt`. This is the simplest setup.

2. **Custom Mode vs Non-custom Mode**:
   - **Custom Mode** (`customMode: true`): Gives you full control over lyrics, style, and title. The prompt is strictly used as lyrics if `instrumental: false`.
   - **Non-custom Mode** (`customMode: false`): Simpler approach where AI auto-generates lyrics based on your prompt.

3. **Generated files are retained for 15 days** before deletion.

4. **Callback process has three stages**:
   - `text`: Text generation complete
   - `first`: First track complete
   - `complete`: All tracks complete

---

## Lyrics Generation API

### Endpoint

**Suno API:**

```
POST https://api.sunoapi.org/api/v1/lyrics
```

### Overview

Generate AI-powered lyrics without creating audio tracks. Useful when you want to create lyrics first and then use them in music generation.

### Request Parameters

| Parameter     | Type         | Required | Description                                            |
| ------------- | ------------ | -------- | ------------------------------------------------------ |
| `prompt`      | string       | Yes      | Detailed description of desired lyrics (max 200 words) |
| `callBackUrl` | string (uri) | Yes      | URL to receive completion notifications                |

### Request Example

```bash
curl --request POST \
  --url https://api.sunoapi.org/api/v1/lyrics \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "prompt": "A song about peaceful night in the city",
    "callBackUrl": "https://api.example.com/callback"
  }'
```

### Response Format

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "5c79****be8e"
  }
}
```

### Usage Notes

- Multiple lyrics variations are returned for selection
- Generated lyrics include song structure markers (e.g., [Verse], [Chorus])
- Lyrics are retained for 15 days
- Callback has only one stage: `complete`
- Results can be used as input for Generate Music endpoint in custom mode

---

## Music Extension API

### Endpoint

**Suno API:**

```
POST https://api.sunoapi.org/api/v1/generate/extend
```

### Overview

Extend existing music tracks with AI-powered continuation, maintaining musical coherence and style. This is ideal for creating longer compositions by extending existing tracks.

### Request Parameters

| Parameter             | Type         | Required    | Description                                                                     |
| --------------------- | ------------ | ----------- | ------------------------------------------------------------------------------- |
| `defaultParamFlag`    | boolean      | Yes         | `true` = use custom parameters, `false` = use original audio parameters         |
| `audioId`             | string       | Yes         | Audio ID of the track to extend                                                 |
| `model`               | string       | Yes         | Model version (must match source audio)                                         |
| `callBackUrl`         | string (uri) | Yes         | Callback URL for completion notifications                                       |
| `prompt`              | string       | Conditional | How music should be extended (required if `defaultParamFlag: true`)             |
| `style`               | string       | Conditional | Music style (required if `defaultParamFlag: true`)                              |
| `title`               | string       | Conditional | Music title (required if `defaultParamFlag: true`)                              |
| `continueAt`          | number       | Conditional | Time point in seconds to start extension (required if `defaultParamFlag: true`) |
| `negativeTags`        | string       | Optional    | Styles to exclude                                                               |
| `vocalGender`         | enum         | Optional    | `m` or `f`                                                                      |
| `styleWeight`         | number       | Optional    | 0.00-1.00                                                                       |
| `weirdnessConstraint` | number       | Optional    | 0.00-1.00                                                                       |
| `audioWeight`         | number       | Optional    | 0.00-1.00                                                                       |

### Parameter Usage Guide

**When `defaultParamFlag: true` (Custom Parameters):**

- `prompt`, `style`, `title`, and `continueAt` are required
- Prompt length limit: 3000 characters
- Style length limit: 200 characters
- Title length limit: 80 characters

**When `defaultParamFlag: false` (Use Default Parameters):**

- Only `audioId` is required
- Other parameters will use the original audio's parameters

### Request Example

```bash
curl --request POST \
  --url https://api.sunoapi.org/api/v1/generate/extend \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "defaultParamFlag": true,
    "audioId": "e231****-****-****-****-****8cadc7dc",
    "prompt": "Extend the music with more relaxing notes",
    "style": "Classical",
    "title": "Peaceful Piano Extended",
    "continueAt": 60,
    "model": "V4_5",
    "negativeTags": "Heavy Metal",
    "vocalGender": "m",
    "styleWeight": 0.65,
    "weirdnessConstraint": 0.65,
    "audioWeight": 0.65,
    "callBackUrl": "https://api.example.com/callback"
  }'
```

### Response Format

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "5c79****be8e"
  }
}
```

### Developer Notes

1. Generated files are retained for 15 days
2. Model version must be consistent with the source music
3. `continueAt` value must be greater than 0 and less than the total duration of the source audio
4. This feature is ideal for creating longer compositions

---

## Additional Audio Processing APIs

### 1. Upload and Cover Audio

Transform existing audio with new styles and arrangements.

**Endpoint:** `POST /api/v1/generate/upload-and-cover`

**Use Case:** Reinterpret songs in different genres or styles.

### 2. Upload and Extend Audio

Upload your own audio files and extend them with AI-generated content.

**Endpoint:** `POST /api/v1/generate/upload-and-extend`

**Use Case:** Extend your original recordings with AI continuation.

### 3. Add Vocals

Generate vocal tracks for instrumental music using advanced AI models.

**Endpoint:** `POST /api/v1/generate/add-vocals`

**Use Case:** Add singing to instrumental tracks.

### 4. Add Instrumental

Create instrumental accompaniment for vocal tracks with AI-powered arrangements.

**Endpoint:** `POST /api/v1/generate/add-instrumental`

**Use Case:** Generate backing music for acapella or vocal recordings.

### 5. Separate Vocals from Music

Extract vocals and instrumental tracks separately using advanced AI audio separation.

**Endpoint:** `POST /api/v1/vocal-removal/generate`

**Use Case:** Create karaoke versions, remixes, or isolate vocals.

### 6. Convert to WAV Format

Convert generated music to high-quality WAV format for professional use.

**Endpoint:** `POST /api/v1/wav-conversion/generate`

**Use Case:** Get lossless audio for professional production.

### 7. Create Music Video

Generate visual music videos from audio tracks using AI video generation technology.

**Endpoint:** `POST /api/v1/music-video/generate`

**Use Case:** Create promotional videos or visual content for your music.

---

## AI Model Versions

Suno offers multiple model versions, each with unique capabilities. Choose the right model for your needs:

### V3_5 - Better Song Structure

**Characteristics:**

- Improved song organization with clear verse/chorus patterns
- Up to 4 minutes duration
- Solid arrangements with creative diversity
- Perfect for structured musical compositions

**Best For:**

- Traditional song structures
- Creative and experimental music
- Budget-conscious projects

### V4 - Improved Vocals

**Characteristics:**

- Enhanced vocal quality and clarity
- Refined audio processing
- Up to 4 minutes duration
- Best audio quality for standard-length tracks

**Best For:**

- Projects where vocal clarity is paramount
- High-quality audio requirements
- Professional recordings

### V4_5 - Smart Prompts

**Characteristics:**

- Excellent prompt understanding
- Faster generation speeds
- Up to 8 minutes duration
- Superior genre blending
- Smarter prompt interpretations

**Best For:**

- Complex music requests
- Longer compositions
- Advanced features and control

### V4_5PLUS - Richer Tones

**Characteristics:**

- Most advanced tonal variation
- New creative approaches
- Enhanced musicality
- Up to 8 minutes duration
- Richer sound quality

**Best For:**

- Highest quality output
- Longest tracks
- Rich, nuanced compositions

### V5 (chirp-crow) - Latest Release (September 23, 2025)

**Characteristics:**

- **Most advanced model** with superior quality
- Enhanced instrumentals and vocals
- Better lyrics generation and coherence
- Improved genre handling and musical styles
- More natural-sounding vocal synthesis
- Optimized processing times
- Better prompt understanding and interpretation
- Cutting-edge AI capabilities
- Superior musical expression
- Faster generation than previous models
- Up to 8 minutes duration

**Best For:**

- Professional music production
- High-quality commercial projects
- Complex musical arrangements
- Superior audio quality requirements
- Latest AI innovations
- Fastest generation times
- State-of-the-art quality

**Pricing:**

- **Cost per request**: $0.07 USD
- **Generation time**: 30-40 seconds for streaming, 2-3 minutes for full quality
- **Output formats**: MP3, WAV support

### Model Version Naming

CometAPI and Suno API use different naming conventions for the same models:

| Suno API Model | CometAPI Model (mv parameter) | Version | Release Date       |
| -------------- | ----------------------------- | ------- | ------------------ |
| V3_5           | chirp-v3.5 or chirp-v3.0      | 3.5     | 2024               |
| V4             | chirp-v4.0                    | 4.0     | Early 2025         |
| V4_5           | chirp-auk                     | 4.5     | May 2025           |
| V4_5PLUS       | chirp-bluejay                 | 4.5+    | July 2025          |
| V5             | chirp-crow                    | 5.0     | September 23, 2025 |

**Usage Examples:**

- Direct Suno API: `"model": "V4_5"`
- CometAPI: `"mv": "chirp-auk"`

### Model Selection Guide

| Use Case             | Recommended Model     | Reason                       |
| -------------------- | --------------------- | ---------------------------- |
| Quick prototypes     | V3_5 or V5            | Speed and cost-effectiveness |
| Vocal-focused tracks | V4 or V4_5PLUS        | Superior vocal quality       |
| Long compositions    | V4_5, V4_5PLUS, or V5 | 8-minute duration support    |
| Complex prompts      | V4_5 or V5            | Better prompt understanding  |
| Highest quality      | V4_5PLUS or V5        | Most advanced features       |
| Budget projects      | V3_5                  | Lower cost, good quality     |

---

## Pricing

### CometAPI Pricing

CometAPI provides a unified API platform for accessing Suno music generation:

| Service                      | CometAPI Price             | Official Suno API Price | Notes                       |
| ---------------------------- | -------------------------- | ----------------------- | --------------------------- |
| **Music Generation**         | $0.144 per create API call | $0.04 per generation    | Generates 2 songs per call  |
| **Continue/Extend API Call** | $0.04 per call             | -                       | Extend existing tracks      |
| **Lyrics Generation**        | $0.02 per create API call  | -                       | Generate lyrics only        |
| **Music Upload**             | $0.02 per call             | -                       | Upload audio for processing |

**Important Pricing Note:**

- **CometAPI charges approximately 3.6x more than the official Suno API** ($0.144 vs $0.04 per generation)
- The premium pricing is offset by the convenience of a unified API platform
- CometAPI provides a single interface for 500+ AI models, not just Suno
- **Trade-off:** Higher cost for simplified integration and unified access

**Free Trial:** Get $1 in credits immediately upon registration.

**Benefits:**

- Unified API access to 500+ AI models (OpenAI, Gemini, Suno, Midjourney, etc.)
- Single API key for all services
- Pay-as-you-go model
- No monthly commitments
- Transparent pricing
- Usage-based billing
- 24/7 technical support

### Official Suno API Pricing

For comparison, here are the official Suno pricing tiers:

#### Free Plan (Basic)

- **Cost:** $0/month
- **Credits:** 50 per day (approximately 10 songs)
- **Use:** Non-commercial only
- **Queue:** Shared generation queue
- **Concurrent Jobs:** 2

#### Pro Plan

- **Cost:** $10/month or $96/year (20% discount)
- **Credits:** 2,500 per month (approximately 500 songs)
- **Use:** Commercial permitted
- **Queue:** Priority access
- **Concurrent Jobs:** 10
- **Top-ups:** Available

#### Premier Plan

- **Cost:** $30/month or $288/year (20% discount)
- **Credits:** 10,000 per month (approximately 2,000 songs)
- **Use:** Commercial permitted
- **Queue:** Priority access
- **Concurrent Jobs:** 10
- **Top-ups:** Available

#### Student Pro Plan

- **Cost:** $5/month (first month free)
- **Credits:** 2,500 per month (approximately 500 songs)
- **Use:** Commercial permitted
- **Requirements:** Student verification

#### Additional Credit Purchases

- **2,500 credits:** $8
- **10,000 credits:** $24

### Credit System

- Each song generation consumes credits based on complexity and length
- Credits for Basic Plan reset daily
- Credits for paid plans renew monthly
- Unused credits do not roll over to the next billing cycle
- Generated files are retained for 15 days

---

## Rate Limits

### Concurrency Limits

**Suno API Direct:**

- **Maximum:** 20 requests every 10 seconds
- Exceeding this limit will result in request rejection
- Each request generates 2 songs

**CometAPI:**

- Supports high throughput
- Each model may have its own rate limits
- Monitor usage and shard requests as needed
- Built for high-concurrency applications

### Best Practices for Rate Limiting

1. **Implement Retry Logic:**
   - Use exponential backoff for retries
   - Handle 429 (Rate Limit Exceeded) errors gracefully

2. **Queue Management:**
   - Implement request queuing in your application
   - Distribute requests over time

3. **Monitoring:**
   - Track your API usage
   - Set up alerts for approaching limits

4. **Throttling:**
   - Use throttling patterns in your code
   - Implement request pooling

5. **Callbacks vs Polling:**
   - Prefer callbacks over frequent polling
   - Reduces unnecessary API calls

---

## Status Codes

### HTTP Status Codes

| Code    | Status                | Description                              |
| ------- | --------------------- | ---------------------------------------- |
| **200** | Success               | Request successful                       |
| **400** | Bad Request           | Invalid parameters                       |
| **401** | Unauthorized          | Invalid or missing API key               |
| **404** | Not Found             | Invalid request method or path           |
| **405** | Method Not Allowed    | Rate limit exceeded                      |
| **413** | Payload Too Large     | Theme or prompt too long                 |
| **429** | Too Many Requests     | Insufficient credits                     |
| **430** | Custom Error          | Call frequency too high, try again later |
| **455** | Service Unavailable   | System maintenance                       |
| **500** | Internal Server Error | Server error                             |

### Task Status Values

| Status         | Description                   |
| -------------- | ----------------------------- |
| **PENDING**    | Task is queued for processing |
| **GENERATING** | Task is being processed       |
| **SUCCESS**    | Task completed successfully   |
| **FAILED**     | Task failed to complete       |

### Callback Stages

Different endpoints have different callback stages:

**Music Generation:**

1. `text` - Text generation complete
2. `first` - First track complete
3. `complete` - All tracks complete

**Lyrics Generation:**

1. `complete` - Generation finished

**Other Endpoints:**

- Most have a single `complete` stage

### Callback Payload Examples

**Stage 1: Text Generation Complete**

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "suno_task_abc123",
    "stage": "text",
    "status": "IN_PROGRESS",
    "response": {
      "lyrics": "[Verse 1]\nGenerated lyrics here...\n[Chorus]\nMore lyrics..."
    }
  }
}
```

**Stage 2: First Track Complete**

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "suno_task_abc123",
    "stage": "first",
    "status": "IN_PROGRESS",
    "response": {
      "data": [
        {
          "id": "audio_123abc",
          "audio_url": "https://cdn.sunoapi.com/tracks/audio_123abc.mp3",
          "stream_url": "https://cdn.sunoapi.com/stream/audio_123abc.mp3",
          "title": "Generated Song Title",
          "tags": "classical, piano, relaxing",
          "duration": 180.5,
          "created_at": "2025-10-10T12:00:00Z",
          "model": "V4_5",
          "prompt": "A calm and relaxing piano track",
          "style": "Classical"
        }
      ]
    }
  }
}
```

**Stage 3: All Tracks Complete**

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "suno_task_abc123",
    "stage": "complete",
    "status": "SUCCESS",
    "response": {
      "data": [
        {
          "id": "audio_123abc",
          "audio_url": "https://cdn.sunoapi.com/tracks/audio_123abc.mp3",
          "stream_url": "https://cdn.sunoapi.com/stream/audio_123abc.mp3",
          "title": "Generated Song Title",
          "tags": "classical, piano, relaxing",
          "duration": 180.5,
          "created_at": "2025-10-10T12:00:00Z",
          "model": "V4_5"
        },
        {
          "id": "audio_456def",
          "audio_url": "https://cdn.sunoapi.com/tracks/audio_456def.mp3",
          "stream_url": "https://cdn.sunoapi.com/stream/audio_456def.mp3",
          "title": "Generated Song Title (Alternative)",
          "tags": "classical, piano, relaxing",
          "duration": 185.2,
          "created_at": "2025-10-10T12:02:00Z",
          "model": "V4_5"
        }
      ]
    }
  }
}
```

**Lyrics Generation Complete**

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "lyrics_task_xyz789",
    "stage": "complete",
    "status": "SUCCESS",
    "response": {
      "data": [
        {
          "id": "lyrics_001",
          "text": "[Verse 1]\nWalking through the city lights\nUnderneath the starry nights\n\n[Chorus]\nThis is where we belong\nSinging our favorite song",
          "title": "City Nights",
          "created_at": "2025-10-10T12:00:00Z"
        }
      ]
    }
  }
}
```

**Error Callback**

```json
{
  "code": 500,
  "msg": "Generation failed",
  "data": {
    "taskId": "suno_task_abc123",
    "status": "FAILED",
    "errorMessage": "Invalid parameters: prompt exceeds maximum length"
  }
}
```

---

## Best Practices

### 1. Prompt Optimization

**Be Specific and Detailed:**

```
Bad:  "Make a song"
Good: "Create an upbeat electronic dance track with synth leads,
       energetic drums, and a catchy melody, reminiscent of
       Calvin Harris style"
```

**Include Key Elements:**

- Musical style and genre
- Mood and atmosphere
- Specific instruments
- Vocal characteristics (if applicable)
- Tempo and energy level
- Song structure preferences

**Example Prompts:**

```python
# Instrumental Track
prompt = "A calm and relaxing piano track with soft melodies,
          gentle strings in the background, peaceful and meditative
          atmosphere, slow tempo, perfect for yoga or meditation"

# Vocal Track
prompt = "An upbeat pop song about summer adventures, bright and
          cheerful melody, female vocals, catchy chorus,
          acoustic guitar and light percussion, feel-good vibes"

# Complex Request
prompt = "A cinematic orchestral piece starting with solo violin,
          gradually building to full orchestra with brass and
          timpani, dramatic and emotional, epic film score style,
          5-minute composition"
```

### 2. Model Selection Strategy

**Consider Your Requirements:**

```python
def choose_model(duration, quality_priority, budget):
    """
    Helper function to select the appropriate model
    """
    if duration > 4:
        # Need longer duration
        if quality_priority == "highest":
            return "V4_5PLUS"
        elif budget == "economy":
            return "V4_5"
        else:
            return "V5"  # Fastest for long tracks
    else:
        # Standard duration
        if quality_priority == "highest":
            return "V4"
        elif budget == "economy":
            return "V3_5"
        else:
            return "V5"  # Latest features
```

### 3. Performance Optimization

**Use Callbacks Instead of Polling:**

```python
# Good: Use callbacks
response = generate_music({
    "prompt": "A jazz melody",
    "callBackUrl": "https://your-server.com/callback"
})

# Avoid: Frequent polling
while status != "SUCCESS":
    time.sleep(5)  # Wastes API calls
    status = check_status(task_id)
```

**Implement Proper Caching:**

```python
import hashlib
import json

def get_cache_key(params):
    """Generate cache key from parameters"""
    param_str = json.dumps(params, sort_keys=True)
    return hashlib.md5(param_str.encode()).hexdigest()

def cached_generate(params, cache, ttl=86400):
    """Cache generated music results"""
    cache_key = get_cache_key(params)

    if cache_key in cache:
        return cache[cache_key]

    result = generate_music(params)
    cache[cache_key] = result
    return result
```

### 4. Error Handling

**Implement Robust Error Handling:**

```python
import time

def generate_with_retry(params, max_retries=3):
    """Generate music with automatic retry logic"""
    for attempt in range(max_retries):
        try:
            response = generate_music(params)
            return response

        except RateLimitError:
            if attempt < max_retries - 1:
                wait_time = (2 ** attempt) * 10  # Exponential backoff
                time.sleep(wait_time)
            else:
                raise

        except InsufficientCreditsError:
            # Handle billing issue
            notify_admin("Insufficient credits")
            raise

        except ServerError as e:
            if attempt < max_retries - 1:
                time.sleep(30)  # Wait before retry
            else:
                raise
```

### 5. Credit Management

**Monitor Usage:**

```python
def check_and_generate(params):
    """Check credits before generating"""
    credits = get_remaining_credits()

    if credits < 10:  # Threshold
        notify_admin("Low credits warning")

    if credits < 1:
        raise InsufficientCreditsError("No credits remaining")

    return generate_music(params)
```

### 6. File Management

**Download and Store Files:**

```python
import requests
from datetime import datetime, timedelta

def download_and_store(audio_url, local_path):
    """
    Download generated music and store locally
    Note: Generated files are only retained for 15 days
    """
    response = requests.get(audio_url)

    with open(local_path, 'wb') as f:
        f.write(response.content)

    # Store metadata
    metadata = {
        'url': audio_url,
        'downloaded_at': datetime.now().isoformat(),
        'expires_at': (datetime.now() + timedelta(days=15)).isoformat()
    }

    return metadata
```

### 7. Prompt Engineering Tips

**Structure Your Prompts:**

```python
def build_prompt(style, mood, instruments, tempo, structure=None):
    """
    Build a well-structured prompt
    """
    prompt_parts = [
        f"A {tempo} {style} track",
        f"with {mood} atmosphere",
        f"featuring {', '.join(instruments)}"
    ]

    if structure:
        prompt_parts.append(f"following {structure} structure")

    return ", ".join(prompt_parts)

# Example usage
prompt = build_prompt(
    style="jazz",
    mood="relaxing and sophisticated",
    instruments=["piano", "double bass", "soft drums"],
    tempo="slow to medium",
    structure="verse-chorus-verse"
)
```

### 8. Batch Processing

**Process Multiple Requests Efficiently:**

```python
import asyncio

async def generate_batch(prompts, max_concurrent=5):
    """
    Generate multiple tracks with concurrency control
    """
    semaphore = asyncio.Semaphore(max_concurrent)

    async def generate_with_limit(prompt):
        async with semaphore:
            return await generate_music_async(prompt)

    tasks = [generate_with_limit(p) for p in prompts]
    return await asyncio.gather(*tasks)
```

### 9. Quality Assurance

**Validate Generated Content:**

```python
def validate_output(result):
    """
    Validate generated music meets requirements
    """
    checks = {
        'has_audio_url': bool(result.get('audio_url')),
        'duration_valid': 0 < result.get('duration', 0) < 500,
        'has_title': bool(result.get('title')),
        'status_success': result.get('status') == 'SUCCESS'
    }

    return all(checks.values()), checks
```

### 10. Security Considerations

**Protect Your API Keys:**

```python
import os
from dotenv import load_dotenv

# Load from environment
load_dotenv()
API_KEY = os.getenv('SUNO_API_KEY')

# Never do this:
# API_KEY = "sk-1234567890abcdef"  # Hardcoded key
```

**Validate User Input:**

```python
def sanitize_prompt(user_prompt, max_length=5000):
    """
    Sanitize and validate user-provided prompts
    """
    # Remove potentially harmful content
    prompt = user_prompt.strip()

    # Limit length
    if len(prompt) > max_length:
        prompt = prompt[:max_length]

    # Additional validation
    if not prompt:
        raise ValueError("Prompt cannot be empty")

    return prompt
```

---

## Code Examples

### Python Examples

#### Complete Music Generation Workflow

```python
import requests
import time
from typing import Dict, Optional

class SunoAPI:
    """
    Comprehensive Suno API client
    """

    def __init__(self, api_key: str, base_url: str = "https://api.sunoapi.org/api/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }

    def generate_music(self, params: Dict) -> str:
        """
        Generate music and return task ID
        """
        response = requests.post(
            f"{self.base_url}/generate",
            headers=self.headers,
            json=params
        )

        result = response.json()

        if result['code'] != 200:
            raise Exception(f"Generation failed: {result['msg']}")

        return result['data']['taskId']

    def generate_lyrics(self, prompt: str, callback_url: str) -> str:
        """
        Generate lyrics only
        """
        params = {
            'prompt': prompt,
            'callBackUrl': callback_url
        }

        response = requests.post(
            f"{self.base_url}/lyrics",
            headers=self.headers,
            json=params
        )

        result = response.json()
        return result['data']['taskId']

    def get_task_status(self, task_id: str) -> Dict:
        """
        Check task status
        """
        response = requests.get(
            f"{self.base_url}/generate/record-info",
            headers=self.headers,
            params={'taskId': task_id}
        )

        result = response.json()
        return result['data']

    def wait_for_completion(self, task_id: str, max_wait: int = 600, poll_interval: int = 30) -> Dict:
        """
        Wait for task to complete

        Args:
            task_id: Task ID to monitor
            max_wait: Maximum wait time in seconds (default 10 minutes)
            poll_interval: Time between status checks in seconds
        """
        start_time = time.time()

        while time.time() - start_time < max_wait:
            status_data = self.get_task_status(task_id)

            if status_data['status'] == 'SUCCESS':
                return status_data['response']
            elif status_data['status'] == 'FAILED':
                raise Exception(f"Generation failed: {status_data.get('errorMessage')}")

            time.sleep(poll_interval)

        raise TimeoutError(f"Task {task_id} did not complete within {max_wait} seconds")

    def extend_music(self, audio_id: str, params: Dict) -> str:
        """
        Extend existing music track
        """
        params['audioId'] = audio_id

        response = requests.post(
            f"{self.base_url}/generate/extend",
            headers=self.headers,
            json=params
        )

        result = response.json()
        return result['data']['taskId']

    def separate_vocals(self, task_id: str, audio_id: str, callback_url: str) -> str:
        """
        Separate vocals from instrumental
        """
        params = {
            'taskId': task_id,
            'audioId': audio_id,
            'callBackUrl': callback_url
        }

        response = requests.post(
            f"{self.base_url}/vocal-removal/generate",
            headers=self.headers,
            json=params
        )

        result = response.json()
        return result['data']['taskId']

    def get_remaining_credits(self) -> float:
        """
        Check remaining credits
        """
        response = requests.get(
            f"{self.base_url}/get-credits",
            headers=self.headers
        )

        result = response.json()
        return result['data']['credits']


# Usage Example
def main():
    # Initialize API client
    api = SunoAPI(api_key='YOUR_API_KEY')

    try:
        # Check remaining credits
        credits = api.get_remaining_credits()
        print(f"Remaining credits: {credits}")

        # Generate lyrics first
        print("Generating lyrics...")
        lyrics_task_id = api.generate_lyrics(
            prompt="A song about adventure and discovery, uplifting and inspiring",
            callback_url="https://your-server.com/lyrics-callback"
        )

        lyrics_result = api.wait_for_completion(lyrics_task_id)
        generated_lyrics = lyrics_result['data'][0]['text']
        print(f"Lyrics generated:\n{generated_lyrics}\n")

        # Generate music with custom parameters
        print("Generating music...")
        music_params = {
            'prompt': generated_lyrics,
            'customMode': True,
            'style': 'Folk Pop',
            'title': 'Adventure Song',
            'instrumental': False,
            'model': 'V4_5',
            'callBackUrl': 'https://your-server.com/music-callback'
        }

        music_task_id = api.generate_music(music_params)

        # Wait for completion
        music_result = api.wait_for_completion(music_task_id)
        print("Music generated successfully!")

        # Display results
        for idx, track in enumerate(music_result['data'], 1):
            print(f"\nTrack {idx}:")
            print(f"  Title: {track['title']}")
            print(f"  Duration: {track['duration']}s")
            print(f"  Audio URL: {track['audio_url']}")

        # Extend the first track
        original_track = music_result['data'][0]
        print("\nExtending music...")

        extend_params = {
            'defaultParamFlag': True,
            'prompt': 'Continue with a beautiful instrumental outro',
            'style': 'Folk Pop',
            'title': 'Adventure Song Extended',
            'continueAt': original_track['duration'] - 30,
            'model': 'V4_5',
            'callBackUrl': 'https://your-server.com/extend-callback'
        }

        extend_task_id = api.extend_music(original_track['id'], extend_params)
        extended_result = api.wait_for_completion(extend_task_id)
        print(f"Extended version created: {extended_result['data'][0]['audio_url']}")

        # Separate vocals
        print("\nSeparating vocals...")
        separation_task_id = api.separate_vocals(
            music_task_id,
            original_track['id'],
            'https://your-server.com/vocal-callback'
        )

        separation_result = api.wait_for_completion(separation_task_id)
        print("Vocal separation completed:")
        print(f"  Instrumental: {separation_result['vocal_removal_info']['instrumental_url']}")
        print(f"  Vocals only: {separation_result['vocal_removal_info']['vocal_url']}")

    except Exception as e:
        print(f"Error: {str(e)}")


if __name__ == "__main__":
    main()
```

### JavaScript/Node.js Examples

#### Complete Music Generation Workflow

```javascript
const axios = require('axios');

class SunoAPI {
  constructor(apiKey, baseUrl = 'https://api.sunoapi.org/api/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async generateMusic(params) {
    const response = await axios.post(`${this.baseUrl}/generate`, params, {
      headers: this.headers,
    });

    const result = response.data;

    if (result.code !== 200) {
      throw new Error(`Generation failed: ${result.msg}`);
    }

    return result.data.taskId;
  }

  async generateLyrics(prompt, callBackUrl) {
    const response = await axios.post(
      `${this.baseUrl}/lyrics`,
      { prompt, callBackUrl },
      { headers: this.headers }
    );

    return response.data.data.taskId;
  }

  async getTaskStatus(taskId) {
    const response = await axios.get(`${this.baseUrl}/generate/record-info`, {
      headers: this.headers,
      params: { taskId },
    });

    return response.data.data;
  }

  async waitForCompletion(taskId, maxWaitTime = 600000) {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getTaskStatus(taskId);

      if (status.status === 'SUCCESS') {
        return status.response;
      } else if (status.status === 'FAILED') {
        throw new Error(`Generation failed: ${status.errorMessage}`);
      }

      // Wait 30 seconds before checking again
      await new Promise((resolve) => setTimeout(resolve, 30000));
    }

    throw new Error('Generation timeout');
  }

  async extendMusic(audioId, params) {
    const response = await axios.post(
      `${this.baseUrl}/generate/extend`,
      { audioId, ...params },
      { headers: this.headers }
    );

    return response.data.data.taskId;
  }

  async separateVocals(taskId, audioId, callBackUrl) {
    const response = await axios.post(
      `${this.baseUrl}/vocal-removal/generate`,
      { taskId, audioId, callBackUrl },
      { headers: this.headers }
    );

    return response.data.data.taskId;
  }

  async getRemainingCredits() {
    const response = await axios.get(`${this.baseUrl}/get-credits`, { headers: this.headers });

    return response.data.data.credits;
  }
}

// Usage example
async function main() {
  const api = new SunoAPI('YOUR_API_KEY');

  try {
    // Check remaining credits
    const credits = await api.getRemainingCredits();
    console.log(`Remaining credits: ${credits}`);

    // Generate lyrics first
    console.log('Generating lyrics...');
    const lyricsTaskId = await api.generateLyrics(
      'A song about adventure and discovery, uplifting and inspiring',
      'https://your-server.com/lyrics-callback'
    );

    const lyricsResult = await api.waitForCompletion(lyricsTaskId);
    const generatedLyrics = lyricsResult.data[0].text;
    console.log('Lyrics generated:', generatedLyrics);

    // Generate music with custom parameters
    console.log('Generating music...');
    const musicTaskId = await api.generateMusic({
      prompt: generatedLyrics,
      customMode: true,
      style: 'Folk Pop',
      title: 'Adventure Song',
      instrumental: false,
      model: 'V4_5',
      callBackUrl: 'https://your-server.com/music-callback',
    });

    // Wait for completion
    const musicResult = await api.waitForCompletion(musicTaskId);
    console.log('Music generated successfully!');

    musicResult.data.forEach((track, index) => {
      console.log(`\nTrack ${index + 1}:`);
      console.log(`  Title: ${track.title}`);
      console.log(`  Duration: ${track.duration}s`);
      console.log(`  Audio URL: ${track.audio_url}`);
    });

    // Extend the first track
    const originalTrack = musicResult.data[0];
    console.log('Extending music...');
    const extendTaskId = await api.extendMusic(originalTrack.id, {
      defaultParamFlag: true,
      prompt: 'Continue with a beautiful instrumental outro',
      style: 'Folk Pop',
      title: 'Adventure Song Extended',
      continueAt: originalTrack.duration - 30,
      model: 'V4_5',
      callBackUrl: 'https://your-server.com/extend-callback',
    });

    const extendedResult = await api.waitForCompletion(extendTaskId);
    console.log('Extended version created:', extendedResult.data[0].audio_url);

    // Separate vocals
    console.log('Separating vocals...');
    const separationTaskId = await api.separateVocals(
      musicTaskId,
      originalTrack.id,
      'https://your-server.com/vocal-callback'
    );

    const separationResult = await api.waitForCompletion(separationTaskId);
    console.log('Vocal separation completed:');
    console.log(`  Instrumental: ${separationResult.vocal_removal_info.instrumental_url}`);
    console.log(`  Vocals only: ${separationResult.vocal_removal_info.vocal_url}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
```

### CometAPI Integration Example (Python)

```python
import openai
import os

# Configure for CometAPI
openai.api_base = "https://api.cometapi.com"
openai.api_key = os.getenv("COMETAPI_API_KEY")

def generate_music_cometapi(prompt, style, title):
    """
    Generate music using CometAPI's OpenAI-compatible interface
    """
    # Note: This is a conceptual example
    # Actual implementation may vary based on CometAPI's specific endpoint

    response = openai.ChatCompletion.create(
        model="suno-v4-5",  # Example model name
        messages=[
            {"role": "system", "content": "You are a music generation assistant."},
            {"role": "user", "content": f"Generate music: {prompt}, Style: {style}, Title: {title}"}
        ],
        temperature=0.7
    )

    return response

# For direct Suno API calls through CometAPI
import requests

def generate_suno_music_cometapi(params):
    """
    Direct Suno music generation through CometAPI
    """
    headers = {
        'Authorization': f'Bearer {os.getenv("COMETAPI_API_KEY")}',
        'Content-Type': 'application/json'
    }

    response = requests.post(
        'https://api.cometapi.com/v1/suno/generate',
        headers=headers,
        json=params
    )

    return response.json()
```

### Webhook/Callback Handler Example

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/music-callback', methods=['POST'])
def music_callback():
    """
    Handle music generation callbacks
    """
    data = request.json

    if data['code'] == 200:
        task_data = data['data']

        # Process based on callback stage
        if 'stage' in task_data:
            stage = task_data['stage']

            if stage == 'text':
                print("Text generation complete")
            elif stage == 'first':
                print("First track ready")
                # Process first track
                track = task_data['data'][0]
                download_and_store(track['audio_url'])
            elif stage == 'complete':
                print("All tracks complete")
                # Process all tracks
                for track in task_data['data']:
                    download_and_store(track['audio_url'])

        return jsonify({'status': 'received'}), 200
    else:
        print(f"Generation failed: {data['msg']}")
        return jsonify({'status': 'error'}), 400

@app.route('/lyrics-callback', methods=['POST'])
def lyrics_callback():
    """
    Handle lyrics generation callbacks
    """
    data = request.json

    if data['code'] == 200:
        lyrics_data = data['data']['data'][0]
        print(f"Lyrics generated:\n{lyrics_data['text']}")

        # Store lyrics in database
        store_lyrics(lyrics_data)

        return jsonify({'status': 'received'}), 200
    else:
        print(f"Lyrics generation failed: {data['msg']}")
        return jsonify({'status': 'error'}), 400

if __name__ == '__main__':
    app.run(port=5000)
```

---

## Error Handling

### Common Errors and Solutions

#### 1. Authentication Errors (401)

**Problem:** Invalid or missing API key

**Solution:**

```python
try:
    result = api.generate_music(params)
except requests.exceptions.HTTPError as e:
    if e.response.status_code == 401:
        print("Authentication failed. Check your API key.")
        # Verify API key is correct
        # Ensure it's properly formatted in headers
```

#### 2. Rate Limit Exceeded (405/430)

**Problem:** Too many requests in a short time

**Solution:**

```python
import time

def generate_with_backoff(api, params, max_retries=5):
    for attempt in range(max_retries):
        try:
            return api.generate_music(params)
        except RateLimitError:
            if attempt < max_retries - 1:
                wait_time = (2 ** attempt) * 10  # Exponential backoff
                print(f"Rate limited. Waiting {wait_time}s...")
                time.sleep(wait_time)
            else:
                raise
```

#### 3. Insufficient Credits (429)

**Problem:** Account has no remaining credits

**Solution:**

```python
def check_credits_before_generate(api, params):
    credits = api.get_remaining_credits()

    if credits < 1:
        # Send notification
        notify_billing_team()
        raise InsufficientCreditsError("Please add credits to your account")

    if credits < 10:
        # Warning threshold
        print(f"Warning: Only {credits} credits remaining")

    return api.generate_music(params)
```

#### 4. Payload Too Large (413)

**Problem:** Prompt or parameters exceed character limits

**Solution:**

```python
def validate_and_truncate(params):
    """
    Validate and truncate parameters to meet limits
    """
    if params.get('customMode'):
        model = params.get('model', 'V3_5')

        # Check prompt length
        if 'prompt' in params:
            max_prompt = 5000 if model in ['V4_5', 'V4_5PLUS', 'V5'] else 3000
            if len(params['prompt']) > max_prompt:
                print(f"Warning: Prompt truncated from {len(params['prompt'])} to {max_prompt} chars")
                params['prompt'] = params['prompt'][:max_prompt]

        # Check style length
        if 'style' in params:
            max_style = 1000 if model in ['V4_5', 'V4_5PLUS', 'V5'] else 200
            if len(params['style']) > max_style:
                params['style'] = params['style'][:max_style]

        # Check title length
        if 'title' in params and len(params['title']) > 80:
            params['title'] = params['title'][:80]

    return params
```

#### 5. Task Failed

**Problem:** Generation task failed during processing

**Solution:**

```python
def handle_failed_task(task_id, api, original_params):
    """
    Handle failed generation tasks
    """
    try:
        status = api.get_task_status(task_id)
        error_msg = status.get('errorMessage', 'Unknown error')

        print(f"Task {task_id} failed: {error_msg}")

        # Log for debugging
        log_error({
            'task_id': task_id,
            'error': error_msg,
            'params': original_params,
            'timestamp': datetime.now().isoformat()
        })

        # Decide whether to retry
        if is_retryable_error(error_msg):
            print("Retrying with adjusted parameters...")
            adjusted_params = adjust_params_for_retry(original_params)
            return api.generate_music(adjusted_params)
        else:
            raise Exception(f"Non-retryable error: {error_msg}")

    except Exception as e:
        print(f"Error handling failed task: {str(e)}")
        raise
```

### Error Handling Best Practices

```python
class MusicGenerationError(Exception):
    """Base exception for music generation errors"""
    pass

class AuthenticationError(MusicGenerationError):
    """API authentication failed"""
    pass

class RateLimitError(MusicGenerationError):
    """Rate limit exceeded"""
    pass

class InsufficientCreditsError(MusicGenerationError):
    """Not enough credits"""
    pass

class ValidationError(MusicGenerationError):
    """Invalid parameters"""
    pass

def robust_generate(api, params):
    """
    Comprehensive error handling for music generation
    """
    try:
        # Validate parameters
        validate_params(params)

        # Check credits
        if api.get_remaining_credits() < 1:
            raise InsufficientCreditsError()

        # Generate music
        task_id = api.generate_music(params)

        # Wait for completion with timeout
        result = api.wait_for_completion(task_id, max_wait=600)

        return result

    except ValidationError as e:
        print(f"Validation error: {str(e)}")
        # Fix parameters and retry
        fixed_params = fix_params(params)
        return api.generate_music(fixed_params)

    except RateLimitError:
        print("Rate limit hit. Implement queue or retry later.")
        raise

    except InsufficientCreditsError:
        print("No credits remaining. Please add credits.")
        notify_billing_team()
        raise

    except AuthenticationError:
        print("Authentication failed. Check API key.")
        raise

    except TimeoutError:
        print("Generation timeout. Task may still be processing.")
        # Option to continue monitoring or cancel
        raise

    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        log_error(e)
        raise
```

---

## File Storage

### Important Notes

1. **Retention Period:** Generated audio files are stored for **15 days** before automatic deletion
2. **Download URLs:** May have limited validity periods
3. **Backup Strategy:** Download and save important files to your own storage immediately

### Download and Store Files

```python
import requests
from pathlib import Path
from datetime import datetime, timedelta
import json

def download_audio(url, local_directory='./generated_music'):
    """
    Download audio file from URL and store locally
    """
    # Create directory if it doesn't exist
    Path(local_directory).mkdir(parents=True, exist_ok=True)

    # Generate filename from URL or timestamp
    filename = f"track_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp3"
    filepath = Path(local_directory) / filename

    # Download file
    response = requests.get(url, stream=True)
    response.raise_for_status()

    with open(filepath, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)

    # Store metadata
    metadata = {
        'original_url': url,
        'local_path': str(filepath),
        'downloaded_at': datetime.now().isoformat(),
        'expires_at': (datetime.now() + timedelta(days=15)).isoformat(),
        'file_size': filepath.stat().st_size
    }

    # Save metadata
    metadata_path = filepath.with_suffix('.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f"Downloaded: {filepath} ({metadata['file_size']} bytes)")
    return str(filepath), metadata

def backup_generated_music(task_result, backup_directory='./music_backup'):
    """
    Backup all tracks from a generation task
    """
    backed_up_files = []

    for track in task_result['data']:
        audio_url = track['audio_url']

        # Create subdirectory for this task
        task_dir = Path(backup_directory) / track.get('id', 'unknown')
        task_dir.mkdir(parents=True, exist_ok=True)

        # Download audio
        filepath, metadata = download_audio(audio_url, str(task_dir))

        # Add track information to metadata
        metadata.update({
            'track_id': track.get('id'),
            'title': track.get('title'),
            'duration': track.get('duration'),
            'tags': track.get('tags'),
            'created_at': track.get('created_at')
        })

        backed_up_files.append({
            'filepath': filepath,
            'metadata': metadata
        })

    return backed_up_files

# Usage
result = api.wait_for_completion(task_id)
backups = backup_generated_music(result)
print(f"Backed up {len(backups)} tracks")
```

### Cloud Storage Integration

```python
# Example: Upload to AWS S3
import boto3
from botocore.exceptions import ClientError

def upload_to_s3(local_file, bucket_name, s3_key):
    """
    Upload generated music to AWS S3 for long-term storage
    """
    s3_client = boto3.client('s3')

    try:
        s3_client.upload_file(
            local_file,
            bucket_name,
            s3_key,
            ExtraArgs={'ContentType': 'audio/mpeg'}
        )

        # Generate presigned URL for access
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': s3_key},
            ExpiresIn=31536000  # 1 year
        )

        print(f"Uploaded to S3: s3://{bucket_name}/{s3_key}")
        return url

    except ClientError as e:
        print(f"S3 upload failed: {e}")
        raise

# Usage
local_path, metadata = download_audio(track['audio_url'])
s3_url = upload_to_s3(local_path, 'my-music-bucket', f"tracks/{track['id']}.mp3")
```

---

## Support

### Official Support Channels

#### Suno API

- **Email:** support@sunoapi.org
- **Documentation:** [https://docs.sunoapi.org/](https://docs.sunoapi.org/)
- **API Status:** Check real-time service status on their status page
- **Support Hours:** 24/7 technical assistance

#### CometAPI

- **Website:** [https://www.cometapi.com/](https://www.cometapi.com/)
- **API Documentation:** [https://apidoc.cometapi.com/](https://apidoc.cometapi.com/)
- **Registration:** [https://api.cometapi.com/](https://api.cometapi.com/)
- **Support:** 24/7 professional technical assistance

### Common Questions

#### Q: How long does music generation take?

**A:** Stream URLs are available in 30-40 seconds. Full downloadable quality is ready in 2-3 minutes.

#### Q: How many songs does each API call generate?

**A:** Each music generation request produces exactly 2 songs.

#### Q: Can I use generated music commercially?

**A:** Yes, with CometAPI or paid Suno plans. The free Suno plan is for non-commercial use only.

#### Q: What happens if my task fails?

**A:** Check the error message in the task status. Common issues include invalid parameters, insufficient credits, or system maintenance. Most errors can be resolved by adjusting parameters or retrying.

#### Q: How do I cancel a running task?

**A:** Currently, there's no explicit cancel endpoint. Tasks will complete or fail on their own. Avoid polling if you don't need the result.

#### Q: Can I use custom audio as input?

**A:** Yes, use the "Upload and Cover" or "Upload and Extend" endpoints to process your own audio files.

### Troubleshooting Guide

| Issue                    | Possible Cause        | Solution                                         |
| ------------------------ | --------------------- | ------------------------------------------------ |
| 401 Unauthorized         | Invalid API key       | Verify API key is correct and properly formatted |
| 429 Insufficient Credits | No credits remaining  | Add credits to your account                      |
| 413 Payload Too Large    | Prompt/style too long | Reduce prompt length according to model limits   |
| 430 Rate Limit           | Too many requests     | Implement rate limiting and retry logic          |
| Task stays PENDING       | High server load      | Wait longer, tasks will process in order         |
| Task FAILED              | Various reasons       | Check errorMessage in task status response       |
| No audio URL             | Task not complete     | Wait for status to become SUCCESS                |

---

## Conclusion

This comprehensive documentation covers all aspects of integrating Suno AI's music generation capabilities through CometAPI or directly through Suno API. Key takeaways:

1. **CometAPI offers significant cost savings** (20% off) with a unified interface
2. **Multiple AI models** available (V3_5, V4, V4_5, V4_5PLUS, V5) for different needs
3. **Flexible pricing** with pay-as-you-go model
4. **Comprehensive features** including music generation, lyrics creation, audio processing, and more
5. **Easy integration** with OpenAI-compatible API format (CometAPI)
6. **15-day file retention** - download important files immediately
7. **Rate limits** - max 20 requests per 10 seconds
8. **Callbacks preferred** over polling for better efficiency

### Next Steps

1. Sign up for CometAPI or Suno API
2. Get your API key
3. Start with simple non-custom mode generations
4. Experiment with different models and parameters
5. Implement proper error handling and retry logic
6. Set up file backup system
7. Monitor credit usage
8. Integrate callbacks for production use

### Resources

- CometAPI: [https://www.cometapi.com/](https://www.cometapi.com/)
- Suno API: [https://sunoapi.org/](https://sunoapi.org/)
- API Documentation: [https://docs.sunoapi.org/](https://docs.sunoapi.org/)
- CometAPI Docs: [https://apidoc.cometapi.com/](https://apidoc.cometapi.com/)

---

**Document Version:** 1.0
**Last Updated:** October 10, 2025
**Author:** Generated via Claude Code with comprehensive web scraping
