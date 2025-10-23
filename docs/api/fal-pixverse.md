# Pixverse V5 Video Generation API (via fal.ai)

## Overview
Pixverse V5 is the latest high-quality video generation model that creates video clips from text and image prompts with support for multiple resolutions, aspect ratios, and stylistic options. V5 offers improved quality over V4.5.

## Base URL
```
https://fal.ai
```

## Authentication
```bash
export FAL_KEY="YOUR_API_KEY"
```

## Models

### Pixverse V5 Text-to-Video (Latest)
**Endpoint**: `fal-ai/pixverse/v5/text-to-video`

Generate videos from text descriptions with improved quality.

**Features**:
- Resolutions: 360p, 540p, 720p, 1080p
- Aspect Ratios: 16:9, 4:3, 1:1, 3:4, 9:16
- Duration: 5s or 8s (8s costs double)
- Style presets available
- Improved quality over V4.5

### Pixverse V5 Image-to-Video (Latest)
**Endpoint**: `fal-ai/pixverse/v5/image-to-video`

Animate static images into video clips with enhanced quality.

**Features**:
- Same resolutions and aspect ratios as T2V
- Camera movement control
- Style transformation
- Negative prompts supported

### Pixverse V4.5 (Still Available)
V4.5 endpoints are still available if needed:
- `fal-ai/pixverse/v4.5/text-to-video`
- `fal-ai/pixverse/v4.5/image-to-video`

## Text-to-Video Example

```typescript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/pixverse/v5/text-to-video", {
  input: {
    prompt: "A majestic dragon soaring through clouds at sunset",
    aspect_ratio: "16:9",
    resolution: "720p",
    duration: "5",
    negative_prompt: "blurry, low quality, distorted",
    style: "cinematic",
    seed: 42
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

const result = await fal.subscribe("fal-ai/pixverse/v5/image-to-video", {
  input: {
    prompt: "A woman warrior walking with her glacier wolf",
    image_url: "https://example.com/warrior.png",
    aspect_ratio: "16:9",
    resolution: "720p",
    duration: "5",
    camera_movement: "zoom_in",
    negative_prompt: "blurry, low quality"
  }
});

console.log(result.data.video.url);
```

## Camera Movement Options

Pixverse supports extensive camera control:

```typescript
camera_movement: "horizontal_left"  // Move camera left
camera_movement: "horizontal_right" // Move camera right
camera_movement: "vertical_up"      // Move camera up
camera_movement: "vertical_down"    // Move camera down
camera_movement: "zoom_in"          // Zoom into scene
camera_movement: "zoom_out"         // Zoom out from scene
camera_movement: "crane_up"         // Crane shot upward
camera_movement: "quickly_zoom_in"  // Fast zoom in
camera_movement: "quickly_zoom_out" // Fast zoom out
camera_movement: "smooth_zoom_in"   // Smooth zoom in
camera_movement: "camera_rotation"  // Rotate camera
camera_movement: "robo_arm"         // Robotic arm movement
camera_movement: "super_dolly_out"  // Dramatic dolly out
camera_movement: "whip_pan"         // Fast whip pan
camera_movement: "hitchcock"        // Vertigo/dolly zoom effect
camera_movement: "left_follow"      // Follow subject left
camera_movement: "right_follow"     // Follow subject right
camera_movement: "pan_left"         // Pan camera left
camera_movement: "pan_right"        // Pan camera right
camera_movement: "fix_bg"           // Fixed background
```

## Style Presets

```typescript
style: "anime"         // Anime/manga style
style: "3d_animation"  // 3D animated look
style: "clay"          // Claymation style
style: "comic"         // Comic book style
style: "cyberpunk"     // Cyberpunk aesthetic
```

## Queue API

### Submit Request
```typescript
const { request_id } = await fal.queue.submit("fal-ai/pixverse/v5/text-to-video", {
  input: {
    prompt: "Your video description",
    resolution: "1080p",
    duration: "5"
  },
  webhookUrl: "https://your-app.com/webhook"
});
```

### Check Status
```typescript
const status = await fal.queue.status("fal-ai/pixverse/v5/text-to-video", {
  requestId: request_id,
  logs: true
});
```

### Get Result
```typescript
const result = await fal.queue.result("fal-ai/pixverse/v5/text-to-video", {
  requestId: request_id
});
```

## Input Schema (Text-to-Video)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | Video description |
| `aspect_ratio` | enum | No | "16:9", "4:3", "1:1", "3:4", "9:16" (default: "16:9") |
| `resolution` | enum | No | "360p", "540p", "720p", "1080p" (default: "720p") |
| `duration` | enum | No | "5" or "8" seconds (default: "5", 8s costs 2x) |
| `negative_prompt` | string | No | What to avoid |
| `style` | enum | No | "anime", "3d_animation", "clay", "comic", "cyberpunk" |
| `seed` | integer | No | Random seed for reproducibility |

## Input Schema (Image-to-Video)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | Animation description |
| `image_url` | string | Yes | URL of input image |
| `aspect_ratio` | enum | No | "16:9", "4:3", "1:1", "3:4", "9:16" |
| `resolution` | enum | No | "360p", "540p", "720p", "1080p" |
| `duration` | enum | No | "5" or "8" seconds (1080p limited to 5s) |
| `negative_prompt` | string | No | What to avoid |
| `style` | enum | No | Style preset |
| `camera_movement` | enum | No | Camera movement type |
| `seed` | integer | No | Random seed |

## Output Schema

```typescript
{
  video: {
    url: string;
    file_size: number;
    file_name: string;
    content_type: "video/mp4";
  }
}
```

## Advanced Features

### Video Extension
Extend existing videos:

```typescript
const result = await fal.subscribe("fal-ai/pixverse/v5/extend", {
  input: {
    video_url: "https://example.com/existing-video.mp4",
    prompt: "Continue the scene with the character walking into the distance",
    duration: "5",
    resolution: "720p"
  }
});
```

### Video Transition
Create transitions between two images:

```typescript
const result = await fal.subscribe("fal-ai/pixverse/v5/transition", {
  input: {
    prompt: "Smooth transition from day to night",
    first_image_url: "https://example.com/day.png",
    last_image_url: "https://example.com/night.png",
    duration: "5"
  }
});
```

## Pricing
- **5 second video** (720p): ~$0.10
- **8 second video** (720p): ~$0.20 (2x cost)
- **1080p**: Higher cost, limited to 5 seconds
- **360p/540p**: Lower cost options

## Best Practices

1. **Resolution Selection**:
   - 720p: Best quality/cost balance
   - 1080p: Premium quality, use sparingly
   - 540p/360p: Fast iteration, lower quality

2. **Duration Management**:
   - Start with 5s (costs less)
   - Use 8s only when needed
   - 1080p automatically limited to 5s

3. **Negative Prompts**:
   - Always include quality-related negatives
   - Default: "blurry, low quality, low resolution, pixelated, noisy"

4. **Seed Usage**:
   - Use seed for reproducible results
   - Omit seed for varied outputs

5. **Camera Movement**:
   - Adds cinematic quality
   - Not required but enhances output
   - Choose based on scene needs

## Prompt Tips

### Good Prompt Structure
```
[Subject] [Action] [Environment] [Style/Quality] [Camera/Lighting]
```

### Examples

**Action Scene**:
```
A samurai warrior drawing his katana in slow motion,
ancient Japanese temple courtyard at sunset,
cinematic lighting with dramatic shadows,
high quality detailed textures
```

**Nature Scene**:
```
Massive waterfall cascading into a crystal clear pool,
surrounded by lush tropical rainforest,
misty atmosphere with rainbow in the spray,
smooth camera pan from top to bottom
```

**Character Animation**:
```
Young girl laughing joyfully as she spins in a flower field,
colorful wildflowers swaying in the breeze,
golden hour lighting, anime style,
gentle tracking shot following her movement
```

## Error Handling

```typescript
try {
  const result = await fal.subscribe("fal-ai/pixverse/v5/text-to-video", {
    input: { prompt: "..." }
  });
} catch (error) {
  console.error("Generation failed:", error.message);
  // Handle specific error cases
  if (error.message.includes("resolution")) {
    console.log("1080p requires 5s duration");
  }
}
```

## Rate Limits
- Check fal.ai dashboard
- Pixverse is relatively fast (30-90 seconds per video)

## Notes
- V5 is the latest and most capable version
- V4.5 is still available for backward compatibility
- Excellent style transfer capabilities
- Strong camera movement options
- Good physics understanding
- Works well for both realistic and stylized content
- Supports the widest range of aspect ratios
- 1080p has duration restriction (max 5s)
- Fast mode available for quicker results at lower quality
