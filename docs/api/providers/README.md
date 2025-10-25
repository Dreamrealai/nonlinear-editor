# API Providers Documentation

This directory contains documentation for external service providers integrated with the application.

## Provider Categories

### Google AI & Cloud Services

**Directory:** [`/google/`](./google/)

Google provides the core AI capabilities for video generation, image generation, and multimodal AI.

- **[VEO2.md](./google/VEO2.md)** - Veo 2 video generation API
- **[VEO3.md](./google/VEO3.md)** - Veo 3 video generation API (latest)
- **[GEMINI.md](./google/GEMINI.md)** - Gemini 2.5 Flash multimodal AI
- **[IMAGEN.md](./google/IMAGEN.md)** - Imagen 3 image generation
- **[CLOUD_VISION.md](./google/CLOUD_VISION.md)** - Cloud Vision video analysis

**Services:**

- Video generation (Veo 2, Veo 3)
- Image generation (Imagen)
- Multimodal AI (Gemini)
- Video analysis (Cloud Vision)

**Setup:**

- Requires Google Cloud project with Vertex AI enabled
- Service account credentials required
- See setup docs for configuration

### Audio Generation Services

#### ElevenLabs

**Directory:** [`/elevenlabs/`](./elevenlabs/)

ElevenLabs provides text-to-speech and voice cloning capabilities.

- **[ELEVENLABS_TTS.md](./elevenlabs/ELEVENLABS_TTS.md)** - Direct ElevenLabs API integration
- **[ELEVENLABS_FAL.md](./elevenlabs/ELEVENLABS_FAL.md)** - ElevenLabs via FAL.AI proxy

**Services:**

- Text-to-speech
- Voice cloning
- Multiple voice options

**Setup:**

- ElevenLabs API key required
- Optional: FAL.AI proxy for additional features

#### Suno/Comet

**File:** [`SUNO_COMET.md`](./SUNO_COMET.md)

Suno (via Comet API) provides AI music and audio generation.

**Services:**

- AI music generation
- Sound effects
- Audio composition

**Setup:**

- Comet API key required
- Access to Suno models

## Integration Overview

### Authentication

Each provider requires its own API key or service account credentials:

```typescript
// Environment variables required
GOOGLE_SERVICE_ACCOUNT=<json-credentials>
ELEVENLABS_API_KEY=<api-key>
COMET_API_KEY=<api-key>
FAL_API_KEY=<api-key>
```

### Common Patterns

All provider integrations follow similar patterns:

1. **Authentication** - API key or service account
2. **Request formatting** - Provider-specific request format
3. **Response handling** - Standardized response parsing
4. **Error handling** - Retry logic and error recovery
5. **Rate limiting** - Provider-specific rate limits

### Error Handling

All providers implement standardized error handling:

```typescript
try {
  const result = await provider.generate(params);
  return result;
} catch (error) {
  if (error.status === 429) {
    // Rate limit - retry with backoff
  } else if (error.status === 503) {
    // Service unavailable - retry
  } else {
    // Log and return error
  }
}
```

## Provider Comparison

### Video Generation

| Provider     | Model   | Max Duration | Resolution | Cost/min |
| ------------ | ------- | ------------ | ---------- | -------- |
| Google Veo 2 | veo-002 | 60s          | 1080p      | Medium   |
| Google Veo 3 | veo-003 | 120s         | 1080p      | High     |

### Audio Generation

| Provider   | Service | Features                       | Cost           |
| ---------- | ------- | ------------------------------ | -------------- |
| ElevenLabs | TTS     | Voice cloning, multiple voices | Per character  |
| Suno/Comet | Music   | AI composition, sound effects  | Per generation |

### Image Generation

| Provider      | Model      | Max Resolution | Cost/image |
| ------------- | ---------- | -------------- | ---------- |
| Google Imagen | imagen-3.0 | 1024x1024      | Medium     |

## Quick Start

### 1. Set Environment Variables

```bash
# Copy example
cp .env.local.example .env.local

# Add provider credentials
GOOGLE_SERVICE_ACCOUNT='{"type":"service_account",...}'
ELEVENLABS_API_KEY='your-key'
COMET_API_KEY='your-key'
```

### 2. Test Provider Connection

```bash
# Run provider tests
npm run test:providers
```

### 3. Use in Application

```typescript
import { generateVideo } from '@/lib/services/video-generation';
import { generateAudio } from '@/lib/services/audio-generation';

// Generate video
const video = await generateVideo({
  provider: 'google-veo3',
  prompt: 'A cat playing piano',
  duration: 5,
});

// Generate audio
const audio = await generateAudio({
  provider: 'elevenlabs',
  text: 'Hello world',
  voice: 'professional',
});
```

## Provider Status

### Production-Ready

- ✅ Google Veo 2
- ✅ Google Veo 3
- ✅ Google Imagen 3
- ✅ Google Gemini 2.5 Flash
- ✅ ElevenLabs TTS

### Beta

- 🔄 Suno/Comet (limited availability)
- 🔄 Cloud Vision (analysis only)

### Deprecated

- ❌ Veo 1 (use Veo 2+)

## Cost Management

### Rate Limiting

All providers have rate limiting configured:

```typescript
// lib/services/provider-config.ts
export const PROVIDER_LIMITS = {
  'google-veo': { requests: 10, per: 'minute' },
  elevenlabs: { requests: 100, per: 'minute' },
  comet: { requests: 5, per: 'minute' },
};
```

### Cost Tracking

Monitor provider costs via admin dashboard:

```typescript
GET / api / admin / provider - usage;
```

## Troubleshooting

### Google Vertex AI Errors

**Error:** `401 Unauthorized`
**Solution:** Check service account credentials and permissions

**Error:** `429 Too Many Requests`
**Solution:** Implement exponential backoff or increase quota

### ElevenLabs Errors

**Error:** `Insufficient credits`
**Solution:** Add credits to ElevenLabs account

**Error:** `Voice not found`
**Solution:** Check voice ID is valid and accessible

### Suno/Comet Errors

**Error:** `Queue full`
**Solution:** Wait and retry - limited concurrent generations

## Related Documentation

- [API Documentation](../API_DOCUMENTATION.md) - Complete API reference
- [Environment Variables](/docs/setup/ENVIRONMENT_VARIABLES.md) - Configuration guide
- [Service Layer Guide](/docs/SERVICE_LAYER_GUIDE.md) - Service architecture

---

**Last Updated:** 2025-10-24
**Provider Count:** 3 (Google, ElevenLabs, Suno/Comet)
**Integration Status:** Production-ready
