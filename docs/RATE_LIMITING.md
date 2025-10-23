# Rate Limiting Documentation

## Overview

This application implements distributed rate limiting using PostgreSQL via Supabase. The rate limiter is designed to handle multiple server instances and horizontal scaling, with an in-memory fallback when the database is unavailable.

## Rate Limit Configuration

### Rate Limit Presets

Located in `lib/rateLimit.ts`:

```typescript
export const RATE_LIMITS = {
  // 10 requests per 10 seconds - for authentication and sensitive operations
  strict: { max: 10, windowMs: 10 * 1000 },

  // 30 requests per minute - for standard API operations
  moderate: { max: 30, windowMs: 60 * 1000 },

  // 100 requests per minute - for read operations and status checks
  relaxed: { max: 100, windowMs: 60 * 1000 },

  // 5 requests per minute - for expensive AI generation operations
  expensive: { max: 5, windowMs: 60 * 1000 },
}
```

## Protected Endpoints

### AI Generation Endpoints (EXPENSIVE: 5 req/min)

All AI generation endpoints are rate limited to **5 requests per minute per user** to prevent abuse and manage API costs.

#### Video Generation
- **Endpoint**: `POST /api/video/generate`
- **Rate Limit Key**: `video-gen:{userId}`
- **Limit**: 5 requests per minute
- **Applies to**: Google Veo, Seedance, MiniMax models

#### Image Generation
- **Endpoint**: `POST /api/image/generate`
- **Rate Limit Key**: `image-gen:{userId}`
- **Limit**: 5 requests per minute
- **Applies to**: Google Imagen models

#### Audio TTS Generation
- **Endpoint**: `POST /api/audio/elevenlabs/generate`
- **Rate Limit Key**: `audio-tts:{userId}`
- **Limit**: 5 requests per minute
- **Applies to**: ElevenLabs text-to-speech

#### Music Generation
- **Endpoint**: `POST /api/audio/suno/generate`
- **Rate Limit Key**: `audio-music:{userId}`
- **Limit**: 5 requests per minute
- **Applies to**: Suno music generation via Comet API

#### Sound Effects Generation
- **Endpoint**: `POST /api/audio/elevenlabs/sfx`
- **Rate Limit Key**: `audio-sfx:{userId}`
- **Limit**: 5 requests per minute
- **Applies to**: ElevenLabs sound effects

## Implementation Details

### Database-Backed Rate Limiting

The rate limiter uses a PostgreSQL function `increment_rate_limit` that:
1. Creates or retrieves the rate limit entry
2. Increments the count atomically
3. Returns the current count AFTER incrementing
4. Handles window expiration automatically

### Race Condition Prevention

The implementation prevents race conditions by:
- Using atomic database operations via PostgreSQL function
- Incrementing count AFTER checking, within a single transaction
- Checking if `currentCount <= max` after increment
- Rejecting requests when `currentCount > max`

### Fallback Strategy

When Supabase is unavailable:
1. Falls back to in-memory Map-based rate limiting
2. Logs warning about using fallback
3. Cleanup interval runs every 5 minutes to remove expired entries
4. Less reliable for distributed systems but ensures availability

## Timeout Handling

All external API calls include timeout handling to prevent hanging requests.

### API Timeouts

#### FAL.ai API (Video Generation)
- **Submit Request**: 60 second timeout
- **Status Check**: 30 second timeout
- **Result Fetch**: 30 second timeout
- **Cancel Request**: 30 second timeout

#### Comet API (Suno Music)
- **Submit Request**: 60 second timeout
- Returns 504 Gateway Timeout on timeout

#### ElevenLabs API
- **TTS Generation**: 60 second timeout
- **SFX Generation**: 60 second timeout (via `fetchWithTimeout`)
- Returns 504 Gateway Timeout on timeout

### Timeout Implementation

Using `AbortController`:

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 60000);

try {
  const response = await fetch(url, {
    signal: controller.signal,
    // ... other options
  });
  clearTimeout(timeout);
} catch (error) {
  clearTimeout(timeout);
  if (error instanceof Error && error.name === 'AbortError') {
    throw new Error('Request timeout after 60s');
  }
  throw error;
}
```

## Rate Limit Response Format

When rate limit is exceeded, the API returns:

### HTTP Status
- **429 Too Many Requests**

### Response Headers
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2025-01-23T12:00:00.000Z
Retry-After: 45
```

### Response Body
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 45
}
```

## Monitoring and Logging

All rate limit events are logged with structured logging:

### Events
- `{service}.{operation}.rate_limited` - Rate limit exceeded
- `{service}.{operation}.rate_limit_ok` - Rate limit check passed
- `rateLimit.check_failed` - Database check failed, using fallback
- `rateLimit.supabase_unavailable` - Supabase credentials missing

### Example Log Entry
```json
{
  "event": "image.generate.rate_limited",
  "userId": "user-uuid",
  "limit": 5,
  "remaining": 0,
  "resetAt": 1705923600000,
  "level": "warn"
}
```

## Best Practices

### For Developers

1. **Always check rate limits early**: Check rate limits before expensive operations
2. **Use appropriate presets**: Choose the correct rate limit preset for your endpoint
3. **Include timeout handling**: All external API calls must have timeouts
4. **Log rate limit events**: Use structured logging for monitoring
5. **Return proper headers**: Always include rate limit headers in responses

### For Frontend

1. **Respect Retry-After header**: Wait before retrying
2. **Show rate limit UI**: Display remaining requests to users
3. **Handle 429 gracefully**: Show user-friendly error messages
4. **Implement exponential backoff**: For automated retries

## Database Schema

Rate limiting uses the `rate_limits` table:

```sql
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_time TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automatic cleanup of expired entries
CREATE INDEX idx_rate_limits_reset_time ON rate_limits(reset_time);
```

## Testing Rate Limits

### Manual Testing

```bash
# Test image generation rate limit
for i in {1..6}; do
  curl -X POST https://your-app.com/api/image/generate \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"prompt":"test","projectId":"uuid"}'
  echo "Request $i"
done
```

Expected: First 5 succeed, 6th returns 429.

### Unit Testing

```typescript
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';

// Should allow requests within limit
const result1 = await checkRateLimit('test:user', RATE_LIMITS.expensive);
expect(result1.success).toBe(true);
expect(result1.remaining).toBe(4);

// Should reject after limit exceeded
for (let i = 0; i < 5; i++) {
  await checkRateLimit('test:user', RATE_LIMITS.expensive);
}
const result2 = await checkRateLimit('test:user', RATE_LIMITS.expensive);
expect(result2.success).toBe(false);
expect(result2.remaining).toBe(0);
```

## Troubleshooting

### Rate Limit Not Working

1. Check Supabase credentials are set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. Verify PostgreSQL function exists:
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'increment_rate_limit';
   ```

3. Check logs for fallback warnings

### Users Hitting Limits Too Often

1. Review rate limit configuration in `lib/rateLimit.ts`
2. Consider increasing limits for specific endpoints
3. Implement usage tiers based on subscription level
4. Add request queuing for non-critical operations

### Timeout Issues

1. Check external API status
2. Increase timeout values if needed
3. Implement retry logic with exponential backoff
4. Consider async processing for long-running operations
