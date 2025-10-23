# API Documentation

This directory contains comprehensive documentation for external APIs used in the non-linear-editor project.

## Files

### fal-ai-docs.md

Complete FAL.AI API documentation including:

- **Authentication:** API key setup and security best practices
- **Queue System:** Asynchronous request handling with status polling and webhooks
- **Video Models:**
  - MiniMax Hailuo 02 (image-to-video)
  - Topaz Video Upscale (video enhancement)
  - Veo 3.1, Sora 2, Kling Video, and more
- **Error Handling:** Complete error type reference with examples
- **Best Practices:** Security, performance, and implementation guidelines
- **Pricing:** Model-specific cost information

## Quick Reference

### Key Endpoints

| Service | Base URL | Purpose |
|---------|----------|---------|
| Queue API | `https://queue.fal.run` | Async video processing |
| Sync API | `https://fal.run` | Fast synchronous requests |
| Storage | `fal.storage.upload()` | File uploads |

### Popular Models

**Video Generation:**
- `fal-ai/minimax/hailuo-02/standard/image-to-video` - Image to video ($0.045/sec)
- `fal-ai/topaz/upscale/video` - Video upscaling ($0.10/sec)
- `fal-ai/veo3.1` - Google's text-to-video
- `fal-ai/sora-2/text-to-video` - OpenAI's video model

### Authentication

```javascript
import { fal } from "@fal-ai/client";

fal.config({
  credentials: process.env.FAL_KEY
});
```

### Basic Usage

```javascript
// Submit and wait for result
const result = await fal.subscribe("fal-ai/minimax/hailuo-02/standard/image-to-video", {
  input: {
    prompt: "A cat walking through a garden",
    image_url: "https://example.com/cat.jpg"
  },
  logs: true,
  onQueueUpdate: (update) => {
    console.log(`Status: ${update.status}`);
  }
});

console.log(result.data.video.url);
```

## Documentation Source

All documentation was scraped from official FAL.AI sources on October 23, 2025:

- https://docs.fal.ai - Main documentation
- https://fal.ai/explore - Model catalog
- https://docs.fal.ai/model-apis/model-endpoints/queue - Queue API
- https://fal.ai/explore/fal-ai/minimax/hailuo-02/standard/image-to-video - Model pages
- https://fal.ai/explore/fal-ai/topaz/upscale/video - Video upscaling

## Updates

To refresh this documentation, run the scraping process again to capture the latest API changes and new models.

## Additional Resources

- FAL.AI Dashboard: https://fal.ai/dashboard
- API Keys: https://fal.ai/dashboard/keys
- Pricing: https://fal.ai/pricing
- Status: https://status.fal.ai
- Discord: https://discord.gg/fal-ai
