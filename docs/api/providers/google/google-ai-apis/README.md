# Google AI APIs Documentation

This directory contains comprehensive API documentation for Google's AI models and services used in this project.

## Contents

### 1. Imagen API (`imagen-api.md`)

Documentation for Google's Imagen 3 and Imagen 4 image generation models.

**Key Features:**

- Text-to-image generation
- Image upscaling
- Multiple model versions (Imagen 3.0, 4.0)
- Advanced safety filters and watermarking
- Prompt enhancement with LLM

**Use Cases:**

- Generate images from text descriptions
- Upscale low-resolution images
- Create variations of existing images

### 2. Veo API (`veo-api.md`)

Documentation for Google's Veo video generation models (Veo 2.0, 3.0, and 3.1).

**Key Features:**

- Text-to-video generation
- Image-to-video generation
- Reference images for style and assets
- Audio generation (Veo 3+)
- Video extension and editing
- Up to 8-second video generation
- 720p and 1080p resolution options

**Use Cases:**

- Generate videos from text prompts
- Animate static images
- Create video content with specific styles
- Generate videos with synchronized audio

### 3. Gemini Models (`gemini-models.md`)

Documentation for Google's Gemini family of multimodal AI models.

**Models Covered:**

- **Gemini 2.5 Pro** - Most advanced reasoning model
- **Gemini 2.5 Flash** - Best price-performance model
- **Gemini 2.5 Flash Image** (NEW!) - Image generation and editing
- **Gemini 2.5 Flash Live** - Real-time audio/video interactions
- **Gemini 2.5 Flash TTS** - Text-to-speech
- **Gemini 2.5 Flash-Lite** - Ultra-fast, cost-efficient

**Key Features:**

- 1M+ token context window
- Multimodal inputs (text, image, audio, video, PDF)
- Function calling
- Code execution
- Structured outputs
- Search grounding
- Thinking mode for complex reasoning

## Quick Start

### Authentication

All APIs require Google Cloud authentication. Set up service account credentials:

```javascript
import { GoogleAuth } from 'google-auth-library';

const auth = new GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});
```

### Common Patterns

#### Generate an Image (Imagen)

```typescript
const response = await fetch(
  `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagen-3.0-generate-002:predict`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instances: [{ prompt: 'A serene mountain landscape' }],
      parameters: { sampleCount: 1 },
    }),
  }
);
```

#### Generate a Video (Veo)

```typescript
const response = await fetch(
  `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/veo-3.1-generate-preview:predictLongRunning`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instances: [{ prompt: 'A futuristic city at sunset' }],
      parameters: {
        durationSeconds: 8,
        generateAudio: true,
        aspectRatio: '16:9',
      },
    }),
  }
);
```

#### Chat with Gemini

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const result = await model.generateContent('Explain quantum computing');
console.log(result.response.text());
```

## API Endpoints

### Imagen

- **Endpoint**: `https://LOCATION-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/LOCATION/publishers/google/models/MODEL_VERSION:predict`
- **Region**: us-central1, europe-west2, asia-northeast3

### Veo

- **Endpoint**: `https://us-central1-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/us-central1/publishers/google/models/MODEL_ID:predictLongRunning`
- **Status Check**: `https://us-central1-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/us-central1/publishers/google/models/MODEL_ID:fetchPredictOperation`
- **Region**: us-central1 only

### Gemini

- **Endpoint**: Uses `@google/generative-ai` SDK
- **Regions**: Multiple regions available

## Environment Variables

Required environment variables for this project:

```bash
# Google Service Account (for Vertex AI APIs)
GOOGLE_SERVICE_ACCOUNT='{"type":"service_account",...}'

# Gemini API (alternative to service account)
GEMINI_API_KEY='your-api-key'

# Project Configuration
PROJECT_ID='your-project-id'
```

## Rate Limits

### Imagen

- Requests per minute: Varies by model
- Images per request: 1-8 (depending on model)

### Veo

- Requests per minute: 10 (Veo 3.1)
- Videos per request: 1-4
- Processing time: 1-5 minutes per video

### Gemini

- Varies by model and tier
- Use batch API for large-scale processing
- Caching available for repeated contexts

## Best Practices

1. **Error Handling**: Always implement retry logic with exponential backoff
2. **Cost Optimization**:
   - Use appropriate model for task (Flash vs Pro)
   - Enable caching for repeated contexts
   - Use batch processing when possible
3. **Security**:
   - Never expose service account keys in client-side code
   - Use environment variables for credentials
   - Implement proper authentication checks
4. **Performance**:
   - Poll long-running operations efficiently
   - Use Cloud Storage for large media files
   - Implement proper timeout handling

## Integration Examples

See the `/lib` directory for integration examples:

- `/lib/veo.ts` - Veo 3.1 integration
- `/lib/gemini.ts` - Gemini integration
- `/app/api/video/` - Video generation API routes
- `/app/api/audio/` - Audio generation API routes

## Resources

### Official Documentation

- [Imagen on Vertex AI](https://cloud.google.com/vertex-ai/generative-ai/docs/image/overview)
- [Veo on Vertex AI](https://cloud.google.com/vertex-ai/generative-ai/docs/video/overview)
- [Gemini API](https://ai.google.dev/gemini-api/docs)

### Getting Started

- [Get Gemini API Key](https://aistudio.google.com/apikey)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Vertex AI Studio](https://console.cloud.google.com/vertex-ai/studio)

### Community

- [Gemini API Community](https://discuss.ai.google.dev/c/gemini-api/)
- [Gemini Cookbook](https://github.com/google-gemini/cookbook)

## Version History

- **2025-10-22**: Initial documentation created
  - Imagen 3.0 and 4.0 API
  - Veo 2.0, 3.0, and 3.1 API
  - Gemini 2.5 models including new Flash Image model

## License

Documentation sourced from Google Cloud and Google AI for Developers.
All API usage subject to Google Cloud Terms of Service.

---

**Last Updated**: October 22, 2025
