# ElevenLabs API Documentation

**Last Updated:** October 23, 2025
**API Version:** v1
**Base URL:** `https://api.elevenlabs.io/v1`

## Table of Contents

1. [Authentication](#authentication)
2. [API Endpoints](#api-endpoints)
   - [Text-to-Speech](#text-to-speech)
   - [Sound Effects Generation](#sound-effects-generation)
   - [Voices](#voices)
   - [Models](#models)
   - [Streaming](#streaming)
   - [WebSocket](#websocket)
3. [Voice Settings](#voice-settings)
4. [Models Overview](#models-overview)
5. [Audio Formats](#audio-formats)
6. [Rate Limits & Concurrency](#rate-limits--concurrency)
7. [Error Codes](#error-codes)
8. [Best Practices](#best-practices)

---

## Authentication

All API requests require authentication using an API key. There are two ways to authenticate:

### Method 1: Header Authentication (Recommended)
```http
xi-api-key: YOUR_API_KEY
```

### Method 2: Query Parameter (WebSocket)
```
?authorization=Bearer YOUR_API_KEY
```

**Getting Your API Key:**
1. Sign up at [elevenlabs.io](https://elevenlabs.io)
2. Navigate to your profile settings
3. Generate an API key from the API section

---

## API Endpoints

### Text-to-Speech

#### Convert Text to Speech
Converts text into speech using a voice of your choice and returns audio.

**Endpoint:** `POST /v1/text-to-speech/{voice_id}`
**Streaming Endpoint:** `POST /v1/text-to-speech/{voice_id}/stream`

**Path Parameters:**
- `voice_id` (string, required) - ID of the voice to be used. Use the Get Voices endpoint to list available voices.

**Headers:**
- `xi-api-key` (string, required) - Your API key
- `Content-Type: application/json`

**Query Parameters:**
- `enable_logging` (boolean, optional, default: `true`) - When set to false, zero retention mode is used (enterprise only)
- `optimize_streaming_latency` (integer, optional, deprecated) - Latency optimization level (0-4)
  - 0: default mode (no latency optimizations)
  - 1: normal latency optimizations (~50% improvement)
  - 2: strong latency optimizations (~75% improvement)
  - 3: max latency optimizations
  - 4: max latency + text normalizer off (best latency, may mispronounce numbers/dates)
- `output_format` (enum, optional, default: `mp3_44100_128`) - Output audio format

**Output Formats:**
- `mp3_22050_32` - MP3 at 22.05kHz, 32kbps
- `mp3_44100_32` - MP3 at 44.1kHz, 32kbps
- `mp3_44100_64` - MP3 at 44.1kHz, 64kbps
- `mp3_44100_96` - MP3 at 44.1kHz, 96kbps
- `mp3_44100_128` - MP3 at 44.1kHz, 128kbps (default)
- `mp3_44100_192` - MP3 at 44.1kHz, 192kbps (requires Creator tier+)
- `pcm_16000` - PCM at 16kHz
- `pcm_22050` - PCM at 22.05kHz
- `pcm_24000` - PCM at 24kHz
- `pcm_44100` - PCM at 44.1kHz (requires Pro tier+)
- `ulaw_8000` - μ-law at 8kHz (commonly used for Twilio)
- `opus_16000` - Opus at 16kHz
- `opus_22050` - Opus at 22.05kHz
- `opus_24000` - Opus at 24kHz
- `opus_44100` - Opus at 44.1kHz

**Request Body:**
```json
{
  "text": "string (required)",
  "model_id": "string (optional, default: eleven_multilingual_v2)",
  "language_code": "string | null (optional)",
  "voice_settings": {
    "stability": "number (0-1, default: 0.5)",
    "similarity_boost": "number (0-1, default: 0.75)",
    "style": "number (0-1, default: 0)",
    "use_speaker_boost": "boolean (default: true)",
    "speed": "number (default: 1.0)"
  },
  "pronunciation_dictionary_locators": [
    {
      "pronunciation_dictionary_id": "string",
      "version_id": "string"
    }
  ],
  "seed": "integer (0-4294967295, optional)",
  "previous_text": "string | null (optional)",
  "next_text": "string | null (optional)",
  "previous_request_ids": ["string"] | null (optional, max 3)",
  "next_request_ids": ["string"] | null (optional, max 3)",
  "apply_text_normalization": "enum (auto | on | off, default: auto)",
  "apply_language_text_normalization": "boolean (default: false)",
  "use_pvc_as_ivc": "boolean (default: false, deprecated)"
}
```

**Request Body Parameters:**
- `text` - The text to convert into speech
- `model_id` - Model identifier (see Models section)
- `language_code` - ISO 639-1 language code to enforce a language
- `voice_settings` - Voice settings to override stored settings
- `pronunciation_dictionary_locators` - Pronunciation dictionaries (max 3)
- `seed` - For deterministic sampling (0-4294967295)
- `previous_text` - Text that came before (for continuity)
- `next_text` - Text that comes after (for continuity)
- `previous_request_ids` - Previous generation request IDs (max 3)
- `next_request_ids` - Next generation request IDs (max 3)
- `apply_text_normalization` - Controls text normalization (auto/on/off)
- `apply_language_text_normalization` - Language-specific normalization (increases latency, currently only Japanese)

**Response:**
- **Success (200):** Returns audio file in the specified format
- **Error (422):** Unprocessable Entity Error

**Example Request:**
```bash
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM" \
  -H "xi-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is a test of the ElevenLabs text to speech API.",
    "model_id": "eleven_multilingual_v2",
    "voice_settings": {
      "stability": 0.5,
      "similarity_boost": 0.75
    }
  }' \
  --output audio.mp3
```

---

### Sound Effects Generation

#### Create Sound Effect
Turn text into sound effects using advanced AI models.

**Endpoint:** `POST /v1/sound-generation`

**Headers:**
- `xi-api-key` (string, required)
- `Content-Type: application/json`

**Query Parameters:**
- `output_format` (enum, optional, default: `mp3_44100_128`) - Same formats as TTS

**Request Body:**
```json
{
  "text": "string (required)",
  "loop": "boolean (default: false)",
  "duration_seconds": "number | null (0.5-30, optional)",
  "prompt_influence": "number (0-1, default: 0.3)",
  "model_id": "string (default: eleven_text_to_sound_v2)"
}
```

**Request Parameters:**
- `text` - Description of the sound effect to generate
- `loop` - Whether to create a smoothly looping sound effect (only for `eleven_text_to_sound_v2`)
- `duration_seconds` - Duration in seconds (0.5-30), auto-guessed if not specified
- `prompt_influence` - How closely to follow the prompt (0-1). Higher = more prompt adherence, less variation
- `model_id` - The model to use for generation

**Response:**
- **Success (200):** Returns the generated sound effect as an audio file
- **Error (422):** Unprocessable Entity Error

**Example Request:**
```bash
curl -X POST "https://api.elevenlabs.io/v1/sound-generation" \
  -H "xi-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Dog barking in the distance",
    "duration_seconds": 5.0,
    "prompt_influence": 0.3
  }' \
  --output sound_effect.mp3
```

---

### Voices

#### List Voices
Gets a list of all available voices with search, filtering, and pagination.

**Endpoint:** `GET /v1/voices`

**Headers:**
- `xi-api-key` (string, required)

**Query Parameters:**
- `next_page_token` (string | null, optional) - Token for pagination
- `page_size` (integer, optional, default: 10, max: 100) - Number of voices to return
- `search` (string | null, optional) - Search term (searches name, description, labels, category)
- `sort` (string | null, optional) - Sort field: `created_at_unix` or `name`
- `sort_direction` (string | null, optional) - Sort direction: `asc` or `desc`
- `voice_type` (string | null, optional) - Filter by type: `personal`, `community`, `default`, `workspace`, `non-default`
- `category` (string | null, optional) - Filter by category: `premade`, `cloned`, `generated`, `professional`
- `fine_tuning_state` (string | null, optional) - Filter by fine-tuning state: `draft`, `not_verified`, `not_started`, `queued`, `fine_tuning`, `fine_tuned`, `failed`, `delayed`
- `collection_id` (string | null, optional) - Filter by collection ID
- `include_total_count` (boolean, optional, default: true) - Include total count (impacts performance)
- `voice_ids` (array of strings | null, optional, max: 100) - Lookup specific voice IDs

**Response:**
```json
{
  "voices": [
    {
      "voice_id": "string",
      "name": "string",
      "category": "string",
      "description": "string",
      "preview_url": "string",
      "available_for_tiers": ["string"],
      "settings": {
        "stability": "number",
        "similarity_boost": "number",
        "style": "number",
        "use_speaker_boost": "boolean",
        "speed": "number"
      },
      "labels": {},
      "high_quality_base_model_ids": ["string"],
      "safety_control": "string",
      "is_owner": "boolean",
      "is_legacy": "boolean",
      "created_at_unix": "integer"
    }
  ],
  "has_more": "boolean",
  "total_count": "integer",
  "next_page_token": "string | null"
}
```

**Example Request:**
```bash
curl -X GET "https://api.elevenlabs.io/v1/voices?page_size=20&search=rachel" \
  -H "xi-api-key: YOUR_API_KEY"
```

#### Get Voice
Returns metadata about a specific voice.

**Endpoint:** `GET /v1/voices/{voice_id}`

**Path Parameters:**
- `voice_id` (string, required) - Voice ID

**Headers:**
- `xi-api-key` (string, required)

**Query Parameters:**
- `with_settings` (boolean, optional, default: true, deprecated) - Ignored parameter

**Response:**
Returns detailed voice metadata including samples, settings, sharing info, and verification status.

**Example Request:**
```bash
curl -X GET "https://api.elevenlabs.io/v1/voices/21m00Tcm4TlvDq8ikWAM" \
  -H "xi-api-key: YOUR_API_KEY"
```

---

### Models

#### List Models
Gets a list of available models.

**Endpoint:** `GET /v1/models`

**Headers:**
- `xi-api-key` (string, required)

**Response:**
```json
[
  {
    "model_id": "string",
    "name": "string | null",
    "can_be_finetuned": "boolean | null",
    "can_do_text_to_speech": "boolean | null",
    "can_do_voice_conversion": "boolean | null",
    "can_use_style": "boolean | null",
    "can_use_speaker_boost": "boolean | null",
    "serves_pro_voices": "boolean | null",
    "token_cost_factor": "number | null",
    "description": "string | null",
    "requires_alpha_access": "boolean | null",
    "max_characters_request_free_user": "integer | null",
    "max_characters_request_subscribed_user": "integer | null",
    "maximum_text_length_per_request": "integer | null",
    "languages": [
      {
        "language_id": "string",
        "name": "string"
      }
    ],
    "model_rates": {
      "character_cost_multiplier": "number"
    },
    "concurrency_group": "string | null"
  }
]
```

**Example Request:**
```bash
curl -X GET "https://api.elevenlabs.io/v1/models" \
  -H "xi-api-key: YOUR_API_KEY"
```

---

### Streaming

The ElevenLabs API supports real-time audio streaming using chunked transfer encoding. This allows clients to process or play audio incrementally as it's generated.

**Streaming is supported for:**
- Text to Speech API
- Voice Changer API
- Audio Isolation API

**How to Stream:**

Simply append `/stream` to the TTS endpoint:
- Standard: `/v1/text-to-speech/{voice_id}`
- Streaming: `/v1/text-to-speech/{voice_id}/stream`

**Python Example:**
```python
from elevenlabs import ElevenLabs

client = ElevenLabs(api_key="YOUR_API_KEY")

audio_stream = client.text_to_speech.convert_as_stream(
    voice_id="21m00Tcm4TlvDq8ikWAM",
    text="Hello, this is a streaming test.",
    model_id="eleven_multilingual_v2"
)

# Process audio chunks as they arrive
for chunk in audio_stream:
    # Play or save the chunk
    pass
```

**Node/TypeScript Example:**
```typescript
import { ElevenLabsClient } from "elevenlabs";

const client = new ElevenLabsClient({ apiKey: "YOUR_API_KEY" });

const audioStream = await client.textToSpeech.convertAsStream(
  "21m00Tcm4TlvDq8ikWAM",
  {
    text: "Hello, this is a streaming test.",
    model_id: "eleven_multilingual_v2"
  }
);

// Process audio chunks
for await (const chunk of audioStream) {
  // Play or save the chunk
}
```

---

### WebSocket

The Text-to-Speech WebSocket API generates audio from partial text input while ensuring consistency. It's ideal for streaming or chunked text input and when word-to-audio alignment is needed.

**WebSocket URL:** `wss://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream-input`

**When to Use WebSocket:**
- Text is being streamed or generated in chunks
- Word-to-audio alignment information is required
- Real-time conversational applications

**When NOT to Use WebSocket:**
- Entire text is available upfront (use HTTP instead for lower latency)
- Quick prototyping (WebSocket is more complex)

**Path Parameters:**
- `voice_id` (string, required) - Voice ID

**Headers:**
- `xi-api-key` (string, required)

**Query Parameters:**
- `authorization` (string, optional) - Bearer token
- `model_id` (string, optional) - Model ID
- `language_code` (string, optional) - ISO 639-1 language code
- `enable_logging` (boolean, optional, default: true)
- `enable_ssml_parsing` (boolean, optional, default: false)
- `output_format` (enum, optional) - Audio format
- `inactivity_timeout` (integer, optional, default: 20, max: 180) - Timeout in seconds
- `sync_alignment` (boolean, optional, default: false) - Include timing data with chunks
- `auto_mode` (boolean, optional, default: false) - Reduce latency (recommended for full sentences)
- `apply_text_normalization` (enum, optional, default: auto) - Text normalization mode
- `seed` (integer, optional, 0-4294967295) - Deterministic sampling seed

**Send Messages:**

1. **Initialize Connection:**
```json
{
  "text": " ",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.75
  },
  "generation_config": {
    "chunk_length_schedule": [120, 160, 250, 290]
  },
  "xi_api_key": "YOUR_API_KEY",
  "try_trigger_generation": false
}
```

2. **Send Text:**
```json
{
  "text": "Hello, ",
  "try_trigger_generation": false,
  "flush": false
}
```

3. **Close Connection:**
```json
{
  "text": ""
}
```

**Receive Messages:**

1. **Audio Output:**
```json
{
  "audio": "base64_encoded_audio",
  "isFinal": false,
  "alignment": {
    "characters": ["H", "e", "l"],
    "character_start_times_seconds": [0.0, 0.1, 0.2],
    "character_end_times_seconds": [0.1, 0.2, 0.3]
  }
}
```

2. **Final Output:**
```json
{
  "isFinal": true
}
```

**Example (Conceptual):**
```javascript
const ws = new WebSocket(
  'wss://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM/stream-input?model_id=eleven_multilingual_v2',
  { headers: { 'xi-api-key': 'YOUR_API_KEY' } }
);

ws.on('open', () => {
  // Initialize
  ws.send(JSON.stringify({
    text: " ",
    voice_settings: { stability: 0.5, similarity_boost: 0.75 }
  }));

  // Send text chunks
  ws.send(JSON.stringify({ text: "Hello, " }));
  ws.send(JSON.stringify({ text: "world!" }));

  // Close
  ws.send(JSON.stringify({ text: "" }));
});

ws.on('message', (data) => {
  const response = JSON.parse(data);
  if (response.audio) {
    // Process audio chunk
  }
  if (response.isFinal) {
    ws.close();
  }
});
```

---

## Voice Settings

Voice settings control the characteristics of generated speech. These can be set as defaults for each voice or overridden per request.

### Get Default Voice Settings
**Endpoint:** `GET /v1/voices/settings/default`

**Headers:**
- `xi-api-key` (string, required)

**Response:**
```json
{
  "stability": 0.5,
  "similarity_boost": 0.75,
  "style": 0,
  "use_speaker_boost": true,
  "speed": 1.0
}
```

### Voice Settings Parameters

#### stability
- **Type:** number (0-1)
- **Default:** 0.5
- **Description:** Determines how stable the voice is and randomness between generations. Lower values introduce broader emotional range. Higher values can result in a monotonous voice with limited emotion.
- **UI Equivalent:** "Stability" slider

#### similarity_boost
- **Type:** number (0-1)
- **Default:** 0.75
- **Description:** Determines how closely the AI should adhere to the original voice when attempting to replicate it.
- **UI Equivalent:** "Clarity + Similarity Enhancement"

#### style
- **Type:** number (0-1)
- **Default:** 0
- **Description:** Attempts to amplify the style of the original speaker. Consumes additional computational resources and might increase latency if set to anything other than 0.
- **Note:** Higher values = more style exaggeration

#### use_speaker_boost
- **Type:** boolean
- **Default:** true
- **Description:** Boosts similarity to the original speaker. Requires slightly higher computational load, which increases latency.

#### speed
- **Type:** number
- **Default:** 1.0
- **Description:** Adjusts the speed of the voice.
  - 1.0 = default speed
  - < 1.0 = slower speech
  - > 1.0 = faster speech

---

## Models Overview

### Available Models

| Model ID | Description | Languages | Character Limit | Latency |
|----------|-------------|-----------|-----------------|---------|
| `eleven_v3` | Most emotionally rich and expressive model (Alpha) | 70+ | 3,000 | Higher |
| `eleven_multilingual_v2` | Most lifelike with rich emotional expression | 29 | 10,000 | Medium |
| `eleven_flash_v2_5` | Ultra-fast, affordable model | 32 | 40,000 | ~75ms† |
| `eleven_flash_v2` | Ultra-fast (English only) | English | 30,000 | ~75ms† |
| `eleven_turbo_v2_5` | Balanced quality and speed | 32 | 40,000 | ~250-300ms† |
| `eleven_turbo_v2` | Balanced (English only) | English | 30,000 | ~250-300ms† |
| `eleven_multilingual_sts_v2` | Speech-to-Speech voice changer | 29 | 10,000 | - |
| `eleven_english_sts_v2` | English Speech-to-Speech | English | 10,000 | - |
| `scribe_v1` | Speech-to-text transcription | 99 | - | - |
| `eleven_music` | Studio-grade music generation | Multilingual | - | - |

† Excluding application & network latency

### Deprecated Models
- `eleven_monolingual_v1` - Use `eleven_multilingual_v2` instead
- `eleven_multilingual_v1` - Use `eleven_multilingual_v2` instead

### Model Selection Guide

**For Quality:** Use `eleven_multilingual_v2`
- Best for high-fidelity audio with rich emotional expression
- Ideal for audiobooks, professional content, video narration

**For Low Latency:** Use `eleven_flash_v2_5` or `eleven_flash_v2`
- Optimized for real-time applications (~75ms latency)
- Perfect for Agents Platform, chatbots, interactive applications

**For Balance:** Use `eleven_turbo_v2_5` or `eleven_turbo_v2`
- Good balance between quality and speed
- ~250-300ms latency

**For Voice Changing:** Use `eleven_multilingual_sts_v2`
- Specialized for Speech-to-Speech conversion

**For Emotional/Dramatic Content:** Use `eleven_v3` (Alpha)
- Character discussions with multiple speakers
- Audiobook production
- Emotional dialogue

### Supported Languages

**Eleven v3 (70+ languages):**
Afrikaans, Arabic, Armenian, Assamese, Azerbaijani, Belarusian, Bengali, Bosnian, Bulgarian, Catalan, Cebuano, Chichewa, Croatian, Czech, Danish, Dutch, English, Estonian, Filipino, Finnish, French, Galician, Georgian, German, Greek, Gujarati, Hausa, Hebrew, Hindi, Hungarian, Icelandic, Indonesian, Irish, Italian, Japanese, Javanese, Kannada, Kazakh, Kirghiz, Korean, Latvian, Lingala, Lithuanian, Luxembourgish, Macedonian, Malay, Malayalam, Mandarin Chinese, Marathi, Nepali, Norwegian, Pashto, Persian, Polish, Portuguese, Punjabi, Romanian, Russian, Serbian, Sindhi, Slovak, Slovenian, Somali, Spanish, Swahili, Swedish, Tamil, Telugu, Thai, Turkish, Ukrainian, Urdu, Vietnamese, Welsh

**Multilingual v2 (29 languages):**
English (USA, UK, Australia, Canada), Japanese, Chinese, German, Hindi, French (France, Canada), Korean, Portuguese (Brazil, Portugal), Italian, Spanish (Spain, Mexico), Indonesian, Dutch, Turkish, Filipino, Polish, Swedish, Bulgarian, Romanian, Arabic (Saudi Arabia, UAE), Czech, Greek, Finnish, Croatian, Malay, Slovak, Danish, Tamil, Ukrainian, Russian

**Flash v2.5 & Turbo v2.5 (32 languages):**
All v2 languages plus: Hungarian, Norwegian, Vietnamese

---

## Audio Formats

### Supported Output Formats

The API supports various audio formats specified via the `output_format` parameter:

#### MP3 Formats
- `mp3_22050_32` - 22.05kHz, 32kbps
- `mp3_44100_32` - 44.1kHz, 32kbps
- `mp3_44100_64` - 44.1kHz, 64kbps
- `mp3_44100_96` - 44.1kHz, 96kbps
- `mp3_44100_128` - 44.1kHz, 128kbps (default)
- `mp3_44100_192` - 44.1kHz, 192kbps (Creator tier+)

#### PCM Formats
- `pcm_16000` - 16kHz
- `pcm_22050` - 22.05kHz
- `pcm_24000` - 24kHz
- `pcm_44100` - 44.1kHz (Pro tier+)

#### Other Formats
- `ulaw_8000` - μ-law at 8kHz (Twilio compatible)
- `opus_16000` - Opus at 16kHz
- `opus_22050` - Opus at 22.05kHz
- `opus_24000` - Opus at 24kHz
- `opus_44100` - Opus at 44.1kHz

**Format Naming Convention:** `codec_sample_rate_bitrate`

**Tier Requirements:**
- MP3 192kbps: Creator tier or above
- PCM 44.1kHz: Pro tier or above

---

## Rate Limits & Concurrency

### Concurrency Limits by Plan

Concurrency limits determine how many requests can be processed simultaneously.

| Plan | Multilingual v2 | Turbo & Flash | STT | Music | Priority |
|------|----------------|---------------|-----|-------|----------|
| Free | 2 | 4 | 8 | N/A | 3 |
| Starter | 3 | 6 | 12 | 2 | 4 |
| Creator | 5 | 10 | 20 | 2 | 5 |
| Pro | 10 | 20 | 40 | 2 | 5 |
| Scale | 15 | 30 | 60 | 3 | 5 |
| Business | 15 | 30 | 60 | 3 | 5 |
| Enterprise | Elevated | Elevated | Elevated | Highest | Highest |

**Response Headers:**
- `current-concurrent-requests` - Current number of concurrent requests
- `maximum-concurrent-requests` - Maximum allowed concurrent requests

### Understanding Concurrency

**Important:** Concurrency limit ≠ Maximum simultaneous connections

A concurrency limit of 5 can typically support approximately **100 simultaneous audio broadcasts**.

This is because:
- Audio generation is faster than audio playback
- Only active generation counts toward concurrency
- WebSocket connections only count during audio generation

**Concurrency vs Requests Per Minute:**

These are different metrics:

**Example 1 (Spaced):**
- 180 requests/minute, each taking 1 second
- Sent 0.33 seconds apart
- Max concurrent: 3
- Average concurrent: 3

**Example 2 (Batched):**
- 180 requests/minute, each taking 3 seconds
- All sent at once
- Max concurrent: 180
- Average concurrent: 9

### Use Case Examples

**AI Voice Agents:**
- Concurrency limit of 5 = ~100 simultaneous conversations
- More if AI speaks less frequently than humans (e.g., customer support)

**Character Voiceovers:**
- Generally >100 simultaneous voiceovers for concurrency limit of 5
- Varies based on dialogue frequency and pauses

**Live Dubbing:**
- Follows general heuristic
- More streams possible with conversational pauses

### Queue Priority

Once concurrency limits are met, requests are queued. Higher-tier plans have higher priority in the queue, typically adding only ~50ms latency.

**To increase limits:**
- Upgrade subscription plan
- Enterprise customers: Contact account manager

---

## Error Codes

### HTTP Status Codes

| Status Code | Error Type | Description |
|-------------|-----------|-------------|
| 200 | Success | Request successful |
| 401 | Unauthorized | Invalid or missing API key |
| 422 | Unprocessable Entity | Invalid request parameters |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |

### Common Error Responses

**422 Unprocessable Entity:**
```json
{
  "detail": {
    "status": "invalid_request_error",
    "message": "Invalid voice_id or text parameter"
  }
}
```

**401 Unauthorized:**
```json
{
  "detail": {
    "status": "invalid_api_key",
    "message": "Invalid API key"
  }
}
```

**429 Rate Limit:**
```json
{
  "detail": {
    "status": "rate_limit_exceeded",
    "message": "Concurrency limit reached"
  }
}
```

---

## Best Practices

### Text Normalization

**Issue:** Flash v2.5 and Turbo v2.5 don't normalize numbers by default to maintain low latency.

**Solutions:**
1. **Use `apply_text_normalization: "on"`** (Enterprise plans only for v2.5 models)
2. **Pre-normalize text** via your LLM before sending to TTS
3. **Use Multilingual v2** for better automatic normalization

**Examples of unnormalized text:**
- Phone numbers: "555-1234" might be read as "five five five dash one two three four"
- Dates: "10/23/2025" might be read incorrectly
- Currencies: "$49.99" might not be read as "forty-nine dollars and ninety-nine cents"

### Continuity Between Requests

For better speech continuity when splitting text:

**Use previous/next text:**
```json
{
  "text": "This is the current segment.",
  "previous_text": "This came before.",
  "next_text": "This comes after."
}
```

**Use request IDs:**
```json
{
  "text": "This is part 2.",
  "previous_request_ids": ["request_id_from_part_1"],
  "next_request_ids": ["request_id_from_part_3"]
}
```

### Deterministic Generation

For reproducible outputs, use the `seed` parameter:
```json
{
  "text": "Hello world",
  "seed": 12345
}
```

**Note:** Determinism is best-effort, not guaranteed.

### Zero Retention Mode

For privacy-sensitive applications (Enterprise only):
```json
{
  "enable_logging": false
}
```

**Impacts:**
- History features unavailable
- Request stitching unavailable
- No data retention

### Choosing the Right Model

**High Quality Needed:**
- Use `eleven_multilingual_v2`
- Accept higher latency for best audio quality

**Low Latency Required:**
- Use `eleven_flash_v2_5` for multilingual
- Use `eleven_flash_v2` for English-only
- ~75ms latency (excluding network)

**Balanced Approach:**
- Use `eleven_turbo_v2_5` for multilingual
- Use `eleven_turbo_v2` for English-only
- ~250-300ms latency

**Real-time Agents:**
- Use Flash or Turbo models
- Consider WebSocket for streaming text input
- Enable `auto_mode` for lower latency

### Streaming vs Standard HTTP

**Use Streaming When:**
- Need to play audio as it's generated
- Reducing perceived latency is important
- Processing audio in chunks

**Use Standard HTTP When:**
- Entire audio file is needed before playback
- Simpler implementation preferred
- Caching the complete file

### WebSocket vs HTTP Streaming

**Use WebSocket When:**
- Text is generated/streamed in chunks
- Need word-to-audio alignment
- Building conversational agents

**Use HTTP Streaming When:**
- Full text available upfront
- Simpler implementation
- Quick prototyping

### Scale Testing

When testing at scale:
1. **Simulate users, not raw requests**
2. **Mimic real user behavior** (waiting for playback, pauses)
3. **Ramp up slowly** over minutes
4. **Add randomness** to request timing and size
5. **Monitor latency** and error codes

**Example Test Pattern:**
- Spawn 1 user per second until target reached
- Each user: TTS request → wait for playback → repeat
- Test for 10+ minutes for stability

---

## Installation

### Python
```bash
pip install elevenlabs
```

### Node.js
```bash
npm install elevenlabs
```

---

## Quick Start Examples

### Python Text-to-Speech
```python
from elevenlabs import ElevenLabs

client = ElevenLabs(api_key="YOUR_API_KEY")

audio = client.text_to_speech.convert(
    voice_id="21m00Tcm4TlvDq8ikWAM",
    text="Hello from ElevenLabs!",
    model_id="eleven_multilingual_v2",
    voice_settings={
        "stability": 0.5,
        "similarity_boost": 0.75
    }
)

# Save to file
with open("output.mp3", "wb") as f:
    f.write(audio)
```

### Node.js Text-to-Speech
```javascript
import { ElevenLabsClient } from "elevenlabs";

const client = new ElevenLabsClient({ apiKey: "YOUR_API_KEY" });

const audio = await client.textToSpeech.convert(
  "21m00Tcm4TlvDq8ikWAM",
  {
    text: "Hello from ElevenLabs!",
    model_id: "eleven_multilingual_v2",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75
    }
  }
);

// Save to file
const fs = require("fs");
fs.writeFileSync("output.mp3", audio);
```

### cURL Text-to-Speech
```bash
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM" \
  -H "xi-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello from ElevenLabs!",
    "model_id": "eleven_multilingual_v2",
    "voice_settings": {
      "stability": 0.5,
      "similarity_boost": 0.75
    }
  }' \
  --output output.mp3
```

---

## Common Voice IDs

Popular pre-made voices (examples - use List Voices API for full list):
- `21m00Tcm4TlvDq8ikWAM` - Rachel
- `AZnzlk1XvdvUeBnXmlld` - Domi
- `EXAVITQu4vr4xnSDxMaL` - Bella
- `ErXwobaYiN019PkySvjV` - Antoni
- `MF3mGyEYCl7XYWbV9V6O` - Elli
- `TxGEqnHWrfWFTfGW9XjX` - Josh
- `VR6AewLTigWG4xSOukaG` - Arnold
- `pNInz6obpgDQGcFmaJgB` - Adam
- `yoZ06aMxZJJ28mfd3POQ` - Sam

**Note:** Always use the List Voices API to get current available voices and their IDs.

---

## Additional Resources

- **Official Documentation:** https://elevenlabs.io/docs
- **API Reference:** https://elevenlabs.io/docs/api-reference
- **Python SDK:** https://github.com/elevenlabs/elevenlabs-python
- **Node.js SDK:** https://github.com/elevenlabs/elevenlabs-js
- **Pricing:** https://elevenlabs.io/pricing/api
- **Support:** Contact via the ElevenLabs dashboard

---

**Document Version:** 1.0
**Last Updated:** October 23, 2025
**Scraped from:** ElevenLabs Official Documentation
