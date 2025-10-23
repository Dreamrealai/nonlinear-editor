# MiniMax (Hailuo AI) Video Generation API (via fal.ai)

## Overview
MiniMax Video 01 Live is a high-quality video generation model by Hailuo AI, optimized for transforming static art into dynamic masterpieces with enhanced smoothness and vivid motion.

## Base URL
```
https://fal.ai
```

## Authentication
```bash
export FAL_KEY="YOUR_API_KEY"
```

## Models

### MiniMax Video 01 Live (Text-to-Video)
**Endpoint**: `fal-ai/minimax/video-01-live`

Generate video clips from text prompts with automatic prompt optimization.

**Features**:
- High-quality motion generation
- Automatic prompt optimization
- Excellent for character animation
- Supports wide range of artistic styles
- Optimized for stability and expression

### MiniMax Video 01 Live (Image-to-Video)
**Endpoint**: `fal-ai/minimax/video-01-live/image-to-video`

Transform static illustrations into dynamic animated clips.

**Features**:
- Enhanced smoothness
- Vivid character motion
- Subtle expression support
- Wide artistic style compatibility

### MiniMax T2V-01-Director
**Endpoint**: `fal-ai/minimax/video-01-live/text-to-video/director`

Advanced text-to-video with camera movement controls.

**Features**:
- Camera movement instructions in prompts
- Up to 3 combined movements
- Professional cinematography control

## Text-to-Video Example

```typescript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/minimax/video-01-live", {
  input: {
    prompt: "A rugged middle-aged man with wheat-colored skin stands in harsh desert sunlight",
    prompt_optimizer: true
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

## Image-to-Video Example

```typescript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/minimax/video-01-live/image-to-video", {
  input: {
    prompt: "The character smiles and waves warmly at the viewer",
    image_url: "https://example.com/character.png",
    prompt_optimizer: true
  }
});

console.log(result.data.video.url);
```

## Director Mode with Camera Controls

```typescript
const result = await fal.subscribe("fal-ai/minimax/video-01-live/text-to-video/director", {
  input: {
    prompt: "[Pan left, Zoom in] A vast landscape reveals a hidden valley",
    prompt_optimizer: true
  }
});
```

### Supported Camera Movements
- `Truck left/right`: Lateral camera movement
- `Pan left/right`: Horizontal rotation
- `Push in/Pull out`: Forward/backward movement
- `Pedestal up/down`: Vertical movement
- `Tilt up/down`: Vertical rotation
- `Zoom in/out`: Focal length change
- `Shake`: Camera shake effect
- `Tracking shot`: Follow subject
- `Static shot`: No camera movement

### Camera Movement Syntax
Use square brackets in your prompt:
```
[Movement1, Movement2, Movement3] Your scene description
```

Example:
```
[Truck left, Pan right, Zoom in] A warrior walks through a misty forest
```

## Queue API

### Submit Request
```typescript
const { request_id } = await fal.queue.submit("fal-ai/minimax/video-01-live", {
  input: {
    prompt: "Your video description",
    prompt_optimizer: true
  },
  webhookUrl: "https://your-app.com/webhook"
});
```

### Check Status
```typescript
const status = await fal.queue.status("fal-ai/minimax/video-01-live", {
  requestId: request_id,
  logs: true
});
```

### Get Result
```typescript
const result = await fal.queue.result("fal-ai/minimax/video-01-live", {
  requestId: request_id
});
```

## Input Schema (Text-to-Video)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | Text description of the video |
| `prompt_optimizer` | boolean | No | Auto-optimize prompt (default: true) |

## Input Schema (Image-to-Video)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | Animation description |
| `image_url` | string | Yes | URL of input image |
| `prompt_optimizer` | boolean | No | Auto-optimize prompt (default: true) |

## Input Schema (Director Mode)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | Prompt with camera movements in brackets |
| `prompt_optimizer` | boolean | No | Auto-optimize prompt (default: true) |

## Output Schema

```typescript
{
  video: {
    url: string;
    content_type?: string;
    file_name?: string;
    file_size?: number;
  }
}
```

## Pricing
- **Standard**: ~$0.10 per video
- **Director Mode**: ~$0.15 per video
- Very cost-effective for high-quality output

## Best Practices

1. **Enable Prompt Optimizer**: Almost always keep `prompt_optimizer: true`
2. **Detailed Character Descriptions**: Include physical features, clothing, expressions
3. **Environment Details**: Describe lighting, atmosphere, setting
4. **Director Mode**: Use for professional camera work
5. **Image-to-Video**: Works best with illustrations and 2D art

## Prompt Structure

### Good Text-to-Video Prompt
```
A [character description] in [environment],
[action/movement], [lighting/atmosphere],
[camera angle/movement], [quality descriptors]
```

### Example
```
A young woman with long flowing hair in a cherry blossom garden,
twirling gracefully as petals fall around her,
soft golden hour lighting with cinematic depth of field,
gentle tracking shot following her movement,
high quality, detailed, smooth motion
```

### Good Image-to-Video Prompt
```
[Action/movement description], [emotion/expression],
[environmental interaction], [motion quality]
```

### Example
```
The character looks at the camera and smiles warmly,
her eyes sparkling with joy,
wind gently moving her hair,
smooth and natural movement
```

## Advanced Features

### Subject Reference (Consistent Character)
For maintaining character consistency across videos:

```typescript
const result = await fal.subscribe("fal-ai/minimax/video-01-live/subject-reference", {
  input: {
    prompt: "The character walks through a forest",
    subject_reference_image_url: "https://example.com/character-ref.png",
    prompt_optimizer: true
  }
});
```

## Error Handling

```typescript
try {
  const result = await fal.subscribe("fal-ai/minimax/video-01-live", {
    input: { prompt: "..." }
  });
} catch (error) {
  console.error("Video generation failed:", error.message);
  // Implement retry logic
}
```

## Rate Limits
- Check fal.ai dashboard for current limits
- MiniMax is generally fast (30-60 seconds per video)

## Tips for Best Results

1. **Character Animation**: MiniMax excels at subtle facial expressions
2. **Artistic Styles**: Works with anime, illustration, 3D, realistic styles
3. **Prompt Optimizer**: Trust it - it significantly improves results
4. **Movement**: Describe both camera and subject movement clearly
5. **Details**: More specific descriptions = better results

## Common Use Cases

- Character dialogue scenes
- Product demonstrations
- Artistic animation
- Explainer videos
- Marketing content
- Social media clips

## Notes
- Excellent for 2D illustration to video
- Strong understanding of human motion
- Good physics simulation
- Optimized for stability over wild motion
- Works well with anime and illustration styles
- Director mode gives professional cinematography control
