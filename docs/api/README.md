# Video Generation API Documentation

This directory contains comprehensive documentation for all video generation APIs integrated into the non-linear editor.

## Available Models

All models are accessed through fal.ai, which provides a unified API interface.

### 1. Sora 2 (OpenAI via fal.ai)
📄 [Full Documentation](./fal-sora-2.md)

**Endpoints**:
- Text-to-Video: `fal-ai/sora-2/text-to-video`
- Image-to-Video: `fal-ai/sora-2/image-to-video`

**Best For**:
- High-quality cinematic videos
- Videos with synchronized audio
- Professional content creation

**Key Features**:
- 720p resolution
- Audio generation included
- 4s, 8s, or 12s duration
- Aspect ratios: 16:9, 9:16

**Pricing**: $0.10/second


### 2. Kling 2.5 Turbo Pro
📄 [Full Documentation](./fal-kling.md)

**Endpoints**:
- Text-to-Video: `fal-ai/kling-video/v2.5-turbo/pro/text-to-video`
- Image-to-Video: `fal-ai/kling-video/v2.5-turbo/pro/image-to-video`

**Best For**:
- Cinematic visuals
- Smooth motion
- Prompt precision

**Key Features**:
- 5s or 10s duration
- Aspect ratios: 16:9, 9:16, 1:1
- CFG scale control
- Negative prompts

**Pricing**: ~$0.15 for 5s, ~$0.30 for 10s

### 3. MiniMax (Hailuo AI) Video 01 Live
📄 [Full Documentation](./fal-minimax.md)

**Endpoints**:
- Text-to-Video: `fal-ai/minimax/video-01-live`
- Image-to-Video: `fal-ai/minimax/video-01-live/image-to-video`
- Director Mode (with camera control): `fal-ai/minimax/video-01-live/text-to-video/director`

**Best For**:
- Character animation
- 2D illustration to video
- Artistic styles

**Key Features**:
- Automatic prompt optimization
- Camera movement controls
- Wide artistic style support
- Subject reference (consistent characters)

**Pricing**: ~$0.10-0.15 per video

### 4. Pixverse V5
📄 [Full Documentation](./fal-pixverse.md)

**Endpoints**:
- Text-to-Video: `fal-ai/pixverse/v5/text-to-video`
- Image-to-Video: `fal-ai/pixverse/v5/image-to-video`
- Video Extension: `fal-ai/pixverse/v5/extend`
- Video Transition: `fal-ai/pixverse/v5/transition`

**Best For**:
- Flexible aspect ratios
- Style transformations
- Camera movement control

**Key Features**:
- Resolutions: 360p, 540p, 720p, 1080p
- Aspect ratios: 16:9, 4:3, 1:1, 3:4, 9:16
- 5s or 8s duration
- Extensive camera movements
- Style presets

**Pricing**: ~$0.10 for 5s (720p), ~$0.20 for 8s

## Quick Comparison

| Model | Best Quality | Best Cost | Best Speed | Audio | Max Duration |
|-------|-------------|-----------|------------|-------|--------------|
| Sora 2 | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ✅ | 12s |
| Kling 2.5 Turbo | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ❌ | 10s |
| MiniMax | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ❌ | ~6s |
| Pixverse V5 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ | 8s |

## Installation

```bash
npm install @fal-ai/client
```

## Basic Usage

```typescript
import { fal } from "@fal-ai/client";

// Configure API key
fal.config({
  credentials: process.env.FAL_KEY
});

// Generate video
const result = await fal.subscribe("fal-ai/sora-2/text-to-video", {
  input: {
    prompt: "Your video description",
    duration: "5"
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      update.logs.map((log) => log.message).forEach(console.log);
    }
  },
});

console.log(result.data.video.url);
```

## Production Best Practices

### 1. Use Queue API
For production, always use the queue API with webhooks:

```typescript
// Submit request
const { request_id } = await fal.queue.submit("fal-ai/sora-2/text-to-video", {
  input: { prompt: "..." },
  webhookUrl: "https://your-app.com/webhook"
});

// Check status (polling)
const status = await fal.queue.status("fal-ai/sora-2/text-to-video", {
  requestId: request_id
});

// Get result
const result = await fal.queue.result("fal-ai/sora-2/text-to-video", {
  requestId: request_id
});
```

### 2. Error Handling
```typescript
try {
  const result = await fal.subscribe("fal-ai/sora-2/text-to-video", {
    input: { prompt: "..." }
  });
} catch (error) {
  console.error("Video generation failed:", error.message);
  // Implement retry logic
}
```

### 3. Rate Limiting
- Implement exponential backoff
- Use webhooks instead of polling
- Monitor your fal.ai dashboard

### 4. Cost Management
- Start with lower resolutions for iteration
- Use shorter durations when possible
- Consider model pricing differences

## Model Selection Guide

### Choose Sora 2 When:
- You need the highest quality
- Audio is required
- Professional content creation
- Budget allows premium pricing

### Choose Kling 2.5 Turbo When:
- Cinematic quality needed
- Precise prompt control required
- Motion fluidity is critical
- 1:1 aspect ratio needed

### Choose MiniMax When:
- Character animation is primary use
- Working with illustrations/2D art
- Need camera control
- Budget conscious

### Choose Pixverse V5 When:
- Need flexibility in aspect ratios
- Style transformation required
- Multiple resolution options needed
- Most cost-effective option desired

## Environment Variables

```bash
# Required
FAL_KEY=your_fal_api_key_here

# Optional (if using OpenAI key directly for Sora)
OPENAI_API_KEY=your_openai_key_here
```

## Support & Resources

- **fal.ai Documentation**: https://docs.fal.ai/
- **fal.ai Dashboard**: https://fal.ai/dashboard
- **fal.ai Pricing**: https://fal.ai/pricing
- **Community Discord**: https://discord.gg/fal-ai

## Notes

- All models support both text-to-video and image-to-video (except where noted)
- Queue API recommended for production workloads
- Webhooks provide better performance than polling
- All models return MP4 format videos
- Safety filters applied to content
