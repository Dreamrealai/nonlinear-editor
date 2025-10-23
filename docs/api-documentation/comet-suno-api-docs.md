# CometAPI Suno Music Generation API Documentation

**Last Updated:** October 23, 2025
**API Version:** Suno v5 (chirp-crow)
**Base URL:** `https://api.cometapi.com`

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Getting Started](#getting-started)
4. [Available Model Versions](#available-model-versions)
5. [API Endpoints](#api-endpoints)
6. [Request & Response Formats](#request--response-formats)
7. [Error Handling](#error-handling)
8. [Rate Limits & Pricing](#rate-limits--pricing)
9. [Code Examples](#code-examples)
10. [Best Practices](#best-practices)

---

## Overview

CometAPI provides access to Suno's AI music generation capabilities through a RESTful API. The Suno API enables developers to:

- Generate AI-powered music with or without lyrics
- Create custom songs with specific styles and prompts
- Generate lyrics from topic descriptions
- Extend existing music tracks (continuation)
- Concatenate music clips
- Separate audio tracks (vocals/instrumentals)
- Create custom voice personas
- Export in multiple formats (MP3, WAV, MIDI)
- Generate music videos (MP4)

### Key Features

- **Multiple Generation Modes:** Inspiration mode, custom mode, and song continuation
- **Advanced Audio Processing:** Audio separation, vocal removal, WAV conversion
- **Persona System:** Create and reuse custom voice characteristics
- **Model Versions:** Support for v3.0 through v5 (chirp-crow)
- **Real-time Status Tracking:** Asynchronous task polling with webhooks
- **No Watermarks:** High-quality, commercial-ready audio output

---

## Authentication

All API requests require authentication using a Bearer token in the HTTP Authorization header.

### Obtaining an API Key

1. Register at [CometAPI Dashboard](https://api.cometapi.com/)
2. Navigate to the token management section
3. Generate a new API key (format: `sk-XXXXX`)
4. New users receive $10 in usage credits

### Authentication Header

```http
Authorization: Bearer sk-your-api-key-here
```

### Security Best Practices

- Never expose API keys in client-side code
- Rotate keys periodically
- Use environment variables to store keys
- Monitor usage through the dashboard

---

## Getting Started

### Quick Start Steps

1. **Get API Key:** Sign up and obtain your API key
2. **Set Base URL:** `https://api.cometapi.com`
3. **Make First Request:** Use the Generate Music endpoint

### Typical Workflow

```
1. Submit Music Generation Task → Receive task_id
2. Poll Status Endpoint → Check task progress
3. Retrieve Results → Download audio/metadata
4. (Optional) Extend/Modify → Continue generation
```

---

## Available Model Versions

The `mv` parameter specifies which Suno model version to use:

| Version | Parameter | Description | Release |
|---------|-----------|-------------|---------|
| **v5** | `chirp-crow` | Latest model with improved quality | Current |
| **v4.5+** | `chirp-bluejay` | Enhanced vocal clarity | 2024 |
| **v4.5** | `chirp-auk` | Balanced performance | 2024 |
| **v4.0** | `chirp-v4` | Standard v4 model | 2024 |
| **v3.5** | `chirp-v3.5` | Legacy v3.5 support | 2023 |
| **v3.0** | `chirp-v3.0` | Original v3 model | 2023 |

### Model Selection Guidelines

- **chirp-crow (v5):** Best quality, recommended for production
- **chirp-bluejay (v4.5+):** Best for vocal-heavy tracks
- **chirp-auk (v4.5):** Good balance of speed and quality
- **chirp-v4:** Standard production use

### Persona Models (Tau Variants)

For artist consistency features, use tau variants:
- `chirp-v3-5-tau`
- `chirp-v4-tau`
- `chirp-auk` (also supports tau features)

---

## API Endpoints

### 1. Generate Lyrics

**Endpoint:** `POST /suno/submit/lyrics`

Generate song lyrics based on a topic or prompt.

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | Topic or theme for lyrics generation |
| `notify_hook` | string | No | Webhook URL for completion notification |

#### Request Example

```bash
curl -X POST 'https://api.cometapi.com/suno/submit/lyrics' \
  -H 'Authorization: Bearer sk-your-api-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": "[Verse]\ncat"
  }'
```

#### Response Example

```json
{
  "code": "success",
  "data": "f2900fb6-a054-4b3c-a886-2e46afa5f166",
  "message": ""
}
```

---

### 2. Generate Music Clip

**Endpoint:** `POST /suno/submit/music`

The primary endpoint for music generation. Supports three modes: Inspiration, Custom, and Continuation.

#### Generation Modes

##### **Mode 1: Inspiration Mode**

AI generates both lyrics and music style based on a simple topic.

**Parameters:**
- `gpt_description_prompt` (string): Topic description
- `mv` (string): Model version

**Example:**

```json
{
  "mv": "chirp-auk",
  "gpt_description_prompt": "cat"
}
```

##### **Mode 2: Custom Mode**

Full control over lyrics, style, and title.

**Parameters:**
- `prompt` (string): Full lyrics with verse markers
- `tags` (string): Style/genre tags (e.g., "emotional punk", "jazz piano")
- `mv` (string): Model version
- `title` (string): Song title
- `make_instrumental` (boolean): Generate instrumental-only track
- `notify_hook` (string, optional): Webhook URL

**Example:**

```json
{
  "prompt": "[Verse]\nWalking down the streets\nBeneath the city lights...",
  "tags": "emotional punk",
  "mv": "chirp-v4",
  "title": "City Lights",
  "make_instrumental": false
}
```

##### **Mode 3: Song Continuation**

Extend an existing song from a specific timestamp.

**Parameters:**
- `prompt` (string): Continuation lyrics
- `tags` (string): Style tags
- `mv` (string): Model version
- `title` (string): Song title
- `task_id` (string): Original task ID
- `continue_clip_id` (string): Clip ID to continue from
- `continue_at` (number): Timestamp in seconds to continue from
- `task` (string): Must be "extend"
- `negative_tags` (string, optional): Styles to avoid

**Example:**

```json
{
  "prompt": "[Verse 2]\nNew verse content...",
  "tags": "bass-driven atmospheric heavy metal",
  "negative_tags": "dance",
  "mv": "chirp-v4",
  "title": "City Lights",
  "task_id": "736a6f88-bd29-4b1e-b110-37132a5325ac",
  "continue_clip_id": "736a6f88-bd29-4b1e-b110-37132a5325ac_1",
  "continue_at": 80,
  "task": "extend"
}
```

##### **Mode 4: Artist Consistency (Persona)**

Generate music using a specific voice persona.

**Parameters:**
- All custom mode parameters
- `persona_id` (string): Persona ID from Create Persona endpoint
- `artist_clip_id` (string): Reference clip ID
- `task` (string): Must be "artist_consistency"
- `mv` (string): Must be tau variant (`chirp-v4-tau`, `chirp-auk`)

**Example:**

```json
{
  "prompt": "[Verse]\nYou're always warm...",
  "tags": "electronic, pop",
  "mv": "chirp-v4-tau",
  "title": "husband",
  "task_id": "f8fa553b-62a5-4091-9b5f-06e6f8817976",
  "task": "artist_consistency",
  "persona_id": "05bf9685-ab17-4b3b-93f6-0537f13f9e17",
  "artist_clip_id": "bd9cfdee-2010-4fdd-ab08-eaa6ac6a86d8"
}
```

##### **Mode 5: Underpainting (Add Instrumentals)**

Add instrumental backing to existing vocals.

**Parameters:**
- `mv` (string): Model version
- `tags` (string): Musical style
- `title` (string): Track title
- `underpainting_clip_id` (string): Clip to add instrumentals to
- `underpainting_start_s` (number): Start timestamp
- `underpainting_end_s` (number): End timestamp
- `task` (string): Must be "underpainting"
- `prompt` (string): Can be empty
- `override_fields` (array): Fields to override

**Example:**

```json
{
  "mv": "chirp-bluejay",
  "tags": "Pop rap, uplifting, magnetic male vocals",
  "title": "Hi Instrumental",
  "underpainting_clip_id": "3c332c7c-85e5-4d36-9949-9af0521af891",
  "underpainting_start_s": 0,
  "underpainting_end_s": 37.9,
  "task": "underpainting",
  "prompt": "",
  "override_fields": ["prompt", "tags"]
}
```

##### **Mode 6: Overpainting (Add Vocals)**

Add vocals to existing instrumental track.

**Parameters:**
- `mv` (string): Model version
- `tags` (string): Vocal style description
- `title` (string): Track title
- `overpainting_clip_id` (string): Instrumental clip
- `overpainting_start_s` (number): Start timestamp
- `overpainting_end_s` (number): End timestamp
- `task` (string): Must be "overpainting"
- `prompt` (string): Lyrics
- `override_fields` (array): Fields to override

#### Response

```json
{
  "code": "success",
  "message": "",
  "data": "736a6f88-bd29-4b1e-b110-37132a5325ac"
}
```

The `data` field contains the `task_id` used for status polling.

---

### 3. Upload Clip

**Endpoint:** `POST /suno/submit/upload`

Upload an existing audio file to use in Suno workflows.

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `audio_url` | string | Yes | Public URL of audio file to upload |
| `title` | string | No | Title for the uploaded clip |

---

### 4. Submit Concatenation

**Endpoint:** `POST /suno/submit/concat`

Merge extended music clips into a single continuous track.

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `clip_id` | string | Yes | ID of the extended clip |
| `is_infill` | boolean | Yes | Whether this is an infill task |

#### Request Example

```bash
curl -X POST 'https://api.cometapi.com/suno/submit/concat' \
  -H 'Authorization: Bearer sk-your-api-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "clip_id": "task_id_after_extension",
    "is_infill": false
  }'
```

#### Response

```json
{
  "code": "success",
  "message": "",
  "data": "736a6f88-bd29-4b1e-b110-37132a5325ac"
}
```

---

### 5. Full Track Audio Separation

**Endpoint:** `POST /suno/submit/audio/separation/full`

Separate a complete audio track into vocals and instrumental components.

---

### 6. Single Track Audio Separation

**Endpoint:** `POST /suno/submit/audio/separation/single`

Separate a single audio track for vocal extraction.

---

### 7. Create New Persona

**Endpoint:** `POST /suno/submit/persona`

Create a reusable voice persona for consistent artist characteristics across multiple generations.

#### Use Case

Maintain consistent vocal characteristics across multiple songs by creating a persona from a reference track.

---

### 8. Single Task Query

**Endpoint:** `GET /suno/fetch/{task_id}`

Query the status and results of a specific task.

#### Request

```bash
curl -X GET 'https://api.cometapi.com/suno/fetch/dcb812bd-40c5-4907-836e-3a7aa9a2e546' \
  -H 'Authorization: Bearer sk-your-api-key'
```

#### Response

```json
{
  "code": "success",
  "message": "",
  "data": {
    "task_id": "dcb812bd-40c5-4907-836e-3a7aa9a2e546",
    "action": "MUSIC",
    "status": "NOT_START",
    "fail_reason": "",
    "submit_time": 1747203819,
    "start_time": 1747203819,
    "finish_time": 0,
    "progress": "0%",
    "data": null
  }
}
```

#### Task Status Values

| Status | Description |
|--------|-------------|
| `NOT_START` | Task queued but not started |
| `IN_PROGRESS` | Task is currently processing |
| `STREAMING` | Audio is being generated |
| `COMPLETE` | Task finished successfully |
| `FAILED` | Task failed (check `fail_reason`) |

---

### 9. Batch Query Tasks

**Endpoint:** `POST /suno/fetch`

Query multiple tasks in a single request for efficient status checking.

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ids` | array[string] | Yes | Array of task IDs to query |
| `action` | string | Yes | Task type: "MUSIC" or "LYRICS" |

#### Request Example

```bash
curl -X POST 'https://api.cometapi.com/suno/fetch' \
  -H 'Authorization: Bearer sk-your-api-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "ids": ["task_1", "task_2", "task_3"],
    "action": "MUSIC"
  }'
```

#### Response Example

```json
{
  "code": "success",
  "message": "",
  "data": [
    {
      "task_id": "346c5d10-a4a1-4f49-a851-66a7dae6cfaf",
      "notify_hook": "",
      "action": "MUSIC",
      "status": "IN_PROGRESS",
      "fail_reason": "",
      "submit_time": 1716191749,
      "start_time": 1716191786,
      "finish_time": 0,
      "progress": "0%",
      "data": [
        {
          "id": "e9893d04-6a63-4007-8473-64b706eca4d1",
          "title": "Electric Dance Party",
          "status": "streaming",
          "metadata": {
            "tags": "club banger high-energy edm",
            "prompt": "[Verse]\nEverybody in the place...",
            "duration": null,
            "gpt_description_prompt": "miku dance"
          },
          "audio_url": "https://audiopipe.suno.ai/?item_id=e9893d04-6a63-4007-8473-64b706eca4d1",
          "image_url": "https://cdn1.suno.ai/image_e9893d04-6a63-4007-8473-64b706eca4d1.png",
          "video_url": "",
          "model_name": "chirp-v3",
          "image_large_url": "https://cdn1.suno.ai/image_large_e9893d04-6a63-4007-8473-64b706eca4d1.png",
          "major_model_version": "v3"
        }
      ]
    }
  ]
}
```

---

### 10. Generate MP4 MV Video

**Endpoint:** `GET /suno/mv/{clip_id}`

Generate a music video (MP4) for a completed music clip.

---

### 11. Get Timing (Lyrics & Audio Timeline)

**Endpoint:** `GET /suno/timing/{clip_id}`

Retrieve synchronized lyrics with audio timestamps for karaoke-style displays.

---

### 12. Get WAV Format File

**Endpoint:** `GET /suno/wav/{clip_id}`

Convert and download the audio in high-quality WAV format.

---

### 13. Get MIDI

**Endpoint:** `GET /suno/midi/{clip_id}`

Export the musical composition as a MIDI file for further editing.

---

## Request & Response Formats

### Standard Response Structure

All API responses follow this structure:

```json
{
  "code": "success" | "error",
  "message": "Error description (if any)",
  "data": "Response data (varies by endpoint)"
}
```

### Common Headers

```http
Authorization: Bearer sk-your-api-key
Content-Type: application/json
```

### Task Response Data Structure

When a task completes successfully, the `data` array contains:

```json
{
  "id": "unique-clip-id",
  "title": "Song Title",
  "status": "complete",
  "metadata": {
    "tags": "genre tags",
    "prompt": "lyrics content",
    "duration": 180.5,
    "gpt_description_prompt": "original prompt"
  },
  "audio_url": "https://audiopipe.suno.ai/?item_id=...",
  "image_url": "https://cdn1.suno.ai/image_...",
  "video_url": "https://cdn1.suno.ai/video_...",
  "model_name": "chirp-v4",
  "major_model_version": "v4"
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Solution |
|------|---------|----------|
| **400** | Bad Request | Check request format and parameters |
| **401** | Invalid Token | Verify API key is correct |
| **403** | Token Disabled | Contact administrator or create new token |
| **404** | Not Found | Check Base URL (try adding `/v1`) |
| **413** | Request Too Large | Reduce prompt length |
| **429** | Rate Limited | Backend account rate limit reached, retry |
| **500** | Internal Server Error | Server issue, retry request |
| **503** | No Available Channel | Model not available in current group |
| **504** | Gateway Timeout | Upstream server timeout, retry |
| **524** | Connection Timeout | Channel congestion, retry request |

### Error Response Example

```json
{
  "code": "error",
  "message": "Invalid API key provided",
  "data": null
}
```

### Retry Logic

For 429, 500, 504, and 524 errors:
1. Wait 2-5 seconds
2. Retry with exponential backoff
3. Maximum 3 retry attempts
4. Contact support if errors persist

---

## Rate Limits & Pricing

### Rate Limits

- No strict TPM/RPM limits mentioned
- Unlimited concurrent requests per the documentation
- 429 errors indicate upstream rate limiting (OpenAI backend)

### Pricing

| Operation | Cost |
|-----------|------|
| Music Generation | $0.144 per create API call |
| Continue/Extend | $0.04 per call |
| Lyrics Generation | $0.02 per create API call |
| Music Upload | $0.02 per call |

### Free Credits

- New users receive $10 in credits upon registration
- Credits are usage-based and deducted per API call

### Cost Optimization Tips

1. Use batch queries to check multiple tasks at once
2. Implement webhook notifications instead of polling
3. Cache completed results to avoid re-generation
4. Use lower model versions for testing

---

## Code Examples

### Example 1: Generate Music (Inspiration Mode)

```javascript
const axios = require('axios');

async function generateMusic() {
  try {
    const response = await axios.post(
      'https://api.cometapi.com/suno/submit/music',
      {
        mv: 'chirp-crow',
        gpt_description_prompt: 'upbeat electronic dance music about summer'
      },
      {
        headers: {
          'Authorization': 'Bearer sk-your-api-key',
          'Content-Type': 'application/json'
        }
      }
    );

    const taskId = response.data.data;
    console.log('Task ID:', taskId);

    // Poll for completion
    await pollTaskStatus(taskId);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

async function pollTaskStatus(taskId) {
  const maxAttempts = 60;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const response = await axios.get(
      `https://api.cometapi.com/suno/fetch/${taskId}`,
      {
        headers: {
          'Authorization': 'Bearer sk-your-api-key'
        }
      }
    );

    const task = response.data.data;
    console.log('Status:', task.status, 'Progress:', task.progress);

    if (task.status === 'COMPLETE') {
      console.log('Audio URL:', task.data[0].audio_url);
      break;
    } else if (task.status === 'FAILED') {
      console.error('Task failed:', task.fail_reason);
      break;
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
  }
}

generateMusic();
```

### Example 2: Generate Custom Song

```python
import requests
import time

API_KEY = 'sk-your-api-key'
BASE_URL = 'https://api.cometapi.com'

def generate_custom_song():
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }

    payload = {
        'prompt': '''[Verse]
Walking through the city streets
Neon lights and concrete beats
Dreams are floating in the air
Freedom calling everywhere

[Chorus]
We're alive tonight
Under starlit skies so bright
Dancing till the morning light
Everything feels right''',
        'tags': 'indie pop, dreamy, atmospheric',
        'mv': 'chirp-crow',
        'title': 'City Dreams',
        'make_instrumental': False
    }

    response = requests.post(
        f'{BASE_URL}/suno/submit/music',
        json=payload,
        headers=headers
    )

    if response.status_code == 200:
        task_id = response.json()['data']
        print(f'Task created: {task_id}')
        return poll_task(task_id, headers)
    else:
        print(f'Error: {response.text}')
        return None

def poll_task(task_id, headers):
    max_attempts = 60

    for attempt in range(max_attempts):
        response = requests.get(
            f'{BASE_URL}/suno/fetch/{task_id}',
            headers=headers
        )

        if response.status_code == 200:
            task = response.json()['data']
            print(f"Status: {task['status']} - Progress: {task['progress']}")

            if task['status'] == 'COMPLETE':
                for clip in task['data']:
                    print(f"Title: {clip['title']}")
                    print(f"Audio: {clip['audio_url']}")
                    print(f"Image: {clip['image_url']}")
                return task['data']
            elif task['status'] == 'FAILED':
                print(f"Failed: {task['fail_reason']}")
                return None

        time.sleep(5)

    print('Timeout waiting for completion')
    return None

if __name__ == '__main__':
    generate_custom_song()
```

### Example 3: Batch Query Tasks

```typescript
import axios from 'axios';

const API_KEY = 'sk-your-api-key';
const BASE_URL = 'https://api.cometapi.com';

interface BatchQueryRequest {
  ids: string[];
  action: 'MUSIC' | 'LYRICS';
}

async function batchQueryTasks(taskIds: string[]) {
  try {
    const response = await axios.post<any>(
      `${BASE_URL}/suno/fetch`,
      {
        ids: taskIds,
        action: 'MUSIC'
      } as BatchQueryRequest,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const tasks = response.data.data;

    tasks.forEach((task: any) => {
      console.log(`Task ${task.task_id}:`);
      console.log(`  Status: ${task.status}`);
      console.log(`  Progress: ${task.progress}`);

      if (task.status === 'COMPLETE' && task.data) {
        task.data.forEach((clip: any) => {
          console.log(`  - ${clip.title}: ${clip.audio_url}`);
        });
      }
    });

    return tasks;
  } catch (error: any) {
    console.error('Batch query error:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
const taskIds = [
  'task-id-1',
  'task-id-2',
  'task-id-3'
];

batchQueryTasks(taskIds);
```

---

## Best Practices

### 1. Task Management

- **Use Batch Queries:** Check multiple tasks in one request
- **Implement Webhooks:** Set `notify_hook` to avoid constant polling
- **Cache Results:** Store completed audio URLs to prevent re-generation
- **Track Task IDs:** Maintain a database of task_id to user mappings

### 2. Prompt Engineering

- **Structure Lyrics:** Use `[Verse]`, `[Chorus]`, `[Bridge]` markers
- **Be Specific with Tags:** Use detailed genre descriptions (e.g., "atmospheric indie rock with acoustic guitar")
- **Avoid Contradictions:** Don't mix conflicting styles in tags
- **Use Negative Tags:** Exclude unwanted elements with `negative_tags`

### 3. Performance Optimization

- **Polling Intervals:** Check status every 5-10 seconds
- **Timeout Management:** Set reasonable timeouts (5-10 minutes)
- **Exponential Backoff:** Increase delay between retries
- **Connection Pooling:** Reuse HTTP connections

### 4. Error Handling

- **Retry on 429/500:** Implement automatic retry with backoff
- **Validate Inputs:** Check prompt length and format before submission
- **Log Failures:** Track `fail_reason` for debugging
- **Monitor Costs:** Track API usage to avoid unexpected charges

### 5. Production Considerations

- **Use Latest Models:** `chirp-crow` (v5) for best quality
- **Implement Rate Limiting:** Prevent abuse in user-facing applications
- **Store Metadata:** Save tags, prompts, and settings for reproducibility
- **CDN Caching:** Cache audio URLs for faster delivery
- **Webhook Security:** Validate webhook signatures

### 6. Music Generation Tips

- **Inspiration Mode:** Quick prototyping and idea generation
- **Custom Mode:** Full creative control for production tracks
- **Continuation:** Create longer songs (combine multiple extends)
- **Personas:** Maintain consistent vocals across albums/playlists
- **Audio Separation:** Extract stems for remixing

---

## Additional Resources

### Official Links

- **CometAPI Website:** https://www.cometapi.com/
- **API Dashboard:** https://api.cometapi.com/
- **Full Documentation:** https://apidoc.cometapi.com/
- **Discord Support:** https://discord.com/invite/HMpuV6FCrG
- **Model Marketplace:** https://api.cometapi.com/pricing

### Related Documentation

- [Suno API Scenario Application Guide](https://apidoc.cometapi.com/suno-api-scenario-application-guide-1252042m0)
- [Setting Suno Version](https://apidoc.cometapi.com/-setting-suno-version-988461m0)
- [CometAPI Retry Logic](https://apidoc.cometapi.com/retry-logic-documentation-for-cometapi-and-openai-official-api-928345m0)

### Community & Support

- **Email Support:** Contact through dashboard
- **Discord Community:** Real-time help from developers
- **API Status:** Monitor through dashboard

---

## Changelog

### Version History

- **v5 (chirp-crow):** Latest model with enhanced quality
- **v4.5+ (chirp-bluejay):** Improved vocal clarity
- **v4.5 (chirp-auk):** Persona support added
- **v4.0 (chirp-v4):** Standard production model
- **v3.5 (chirp-v3.5):** Legacy support
- **v3.0 (chirp-v3.0):** Original release

---

## Glossary

- **Task ID:** Unique identifier for asynchronous operations
- **Clip ID:** Unique identifier for generated audio clips
- **Persona ID:** Identifier for custom voice characteristics
- **Webhook:** HTTP callback for task completion notifications
- **Tau Variant:** Model version supporting artist consistency
- **Underpainting:** Adding instrumentals to existing vocals
- **Overpainting:** Adding vocals to existing instrumentals
- **Infill:** Filling gaps in concatenated audio

---

**End of Documentation**

For the most up-to-date information, always refer to the [official CometAPI documentation](https://apidoc.cometapi.com/).
