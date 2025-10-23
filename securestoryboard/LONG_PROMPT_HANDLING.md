# Handling Long Gemini Prompts on Netlify

## The Problem

Netlify Functions have a maximum execution time of 10 seconds by default, which can be extended to 26 seconds for Pro/Business plans. However, Gemini API calls can take anywhere from 5 seconds to over a minute, and **response time is unpredictable** - it depends on:

- Model server state (cold start vs warm)
- Complexity of generation task
- Current API load and rate limiting
- Output length being generated
- Network conditions

## Solution: Universal Timeout Handler

Since we can't predict response time based on input length, we've implemented a universal approach that handles ALL requests the same way:

### generate-prompts-universal.js

This endpoint uses a "try fast, fallback to async" approach:

1. **First Attempt**: Try to generate directly with a 25-second timeout
   - If successful, return immediately
   - If timeout, automatically fallback to async

2. **Async Fallback**: Create a background job
   - Return job ID immediately
   - Process in background without timeout constraints
   - Client polls for results

**Key Benefits:**
- No need to predict which requests will be slow
- Fast requests complete immediately (best case: 5-10 seconds)
- Medium requests still complete directly (up to 25 seconds)
- Slow requests don't fail (handled via polling)
- Transparent to the user - they see progress either way

### Frontend Implementation

The frontend (`main.js`) handles both response types seamlessly:

```javascript
// Always use universal endpoint
const response = await fetch('/.netlify/functions/generate-prompts-universal', ...);

if (data.method === 'direct') {
  // Got immediate response - use it
  initialData = data;
} else if (data.jobId) {
  // Need to poll - show appropriate messaging
  // Poll until complete
}
```

### Configuration

#### netlify.toml
```toml
[functions]
  timeout = 26  # Maximum for Pro plans
```

#### Environment Variables
```bash
GEMINI_KEY=your-api-key
```

## Usage Experience

From the user's perspective:

1. **Fast requests (< 25 seconds)**: Work exactly as before
2. **Slow requests (> 25 seconds)**: 
   - See "This is taking a bit longer than usual..."
   - Then periodic updates on progress
   - Eventually completes successfully

## Alternative Solutions (If Needed)

### 1. Netlify Edge Functions
- 50-second timeout limit (vs 26 for regular functions)
- Different runtime (Deno instead of Node.js)
- Good for slightly longer timeouts

### 2. External Processing Service
- AWS Lambda with longer timeouts (up to 15 minutes)
- Google Cloud Functions (up to 60 minutes)
- Dedicated server with job queue

### 3. Streaming Responses
- Use Gemini's streaming API
- Return partial results as they arrive
- Better perceived performance

## Best Practices

1. **Don't try to predict timeout**
   - Input length doesn't correlate with response time
   - Always be prepared for both fast and slow responses

2. **Provide good user feedback**
   - Show progress for long operations
   - Allow cancellation
   - Save state for recovery

3. **Set realistic expectations**
   - Inform users that complex prompts take time
   - Show estimated time remaining when possible

## Monitoring

Track these metrics:
- Percentage of direct vs async responses
- Average response times
- Timeout rates by time of day
- Job completion rates

This helps identify patterns and optimize the timeout threshold.
