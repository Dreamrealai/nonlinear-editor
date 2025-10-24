# Webhook Integration Guide

> **Non-Linear Video Editor Webhooks Documentation**
>
> Version: 1.0.0
> Last Updated: 2025-10-24

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Webhook Events](#webhook-events)
- [Security](#security)
- [Delivery & Retry](#delivery--retry)
- [Implementation Examples](#implementation-examples)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Overview

Webhooks allow you to receive real-time notifications when long-running operations complete, eliminating the need for constant polling. When you start a video or audio generation job, you can provide a `webhook_url` parameter, and we'll send an HTTP POST request to that URL when the job completes or fails.

### Benefits

- **No Polling Required**: Receive immediate notifications instead of polling status endpoints
- **Reduced Load**: Fewer API calls mean lower costs and better performance
- **Real-time Updates**: Get notified instantly when operations complete
- **Reliable Delivery**: Automatic retry with exponential backoff ensures delivery

### Supported Operations

Webhooks are supported for these long-running operations:

- **Video Generation** (`/api/video/generate`)
- **Audio Generation - Suno** (`/api/audio/suno/generate`)
- **Audio Generation - ElevenLabs** (`/api/audio/elevenlabs/generate`)

---

## Getting Started

### 1. Prepare Your Webhook Endpoint

Create an HTTPS endpoint that can receive POST requests:

```typescript
// Example webhook handler (Next.js API route)
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const payload = await req.json();

  // Verify webhook signature (recommended)
  const signature = req.headers.get('X-Webhook-Signature');
  // ... verify signature (see Security section)

  // Process the webhook
  console.log('Webhook received:', payload);

  // Return 200 OK to acknowledge receipt
  return NextResponse.json({ received: true });
}
```

**Requirements:**

- Must accept POST requests
- Must use HTTPS in production (HTTP allowed in development)
- Should return 2xx status code to acknowledge receipt
- Must respond within 30 seconds

### 2. Include webhook_url in API Requests

Add the `webhook_url` parameter when starting operations:

```json
POST /api/video/generate
{
  "prompt": "A serene lake at sunset",
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "model": "veo-3.1-generate-preview",
  "webhook_url": "https://your-domain.com/api/webhooks/video"
}
```

### 3. Receive Webhook Notifications

When the operation completes, you'll receive a POST request:

```json
{
  "event": "video.generation.completed",
  "timestamp": "2025-10-24T12:00:00.000Z",
  "data": {
    "operationId": "projects/123/locations/us-central1/operations/456",
    "userId": "user-uuid",
    "projectId": "project-uuid",
    "status": "completed",
    "result": {
      "assetId": "asset-uuid",
      "storageUrl": "supabase://assets/..."
    }
  }
}
```

---

## Webhook Events

### Event Types

| Event                        | Triggered When            |
| ---------------------------- | ------------------------- |
| `video.generation.completed` | Video generation succeeds |
| `video.generation.failed`    | Video generation fails    |
| `audio.generation.completed` | Audio generation succeeds |
| `audio.generation.failed`    | Audio generation fails    |

### Payload Structure

All webhook payloads follow this structure:

```typescript
interface WebhookPayload {
  event: string; // Event type
  timestamp: string; // ISO 8601 timestamp
  data: {
    operationId: string; // Original operation ID
    userId: string; // User who initiated the operation
    projectId: string; // Project ID
    status: 'completed' | 'failed';
    result?: {
      // Only present if status is 'completed'
      assetId?: string; // Generated asset ID
      storageUrl?: string; // Asset storage URL
      metadata?: object; // Additional metadata
    };
    error?: string; // Only present if status is 'failed'
  };
}
```

### Success Event Example

```json
{
  "event": "video.generation.completed",
  "timestamp": "2025-10-24T12:34:56.789Z",
  "data": {
    "operationId": "projects/123/operations/456",
    "userId": "user-abc-123",
    "projectId": "proj-def-456",
    "status": "completed",
    "result": {
      "assetId": "asset-ghi-789",
      "storageUrl": "supabase://assets/user-abc-123/proj-def-456/video.mp4"
    }
  }
}
```

### Failure Event Example

```json
{
  "event": "video.generation.failed",
  "timestamp": "2025-10-24T12:34:56.789Z",
  "data": {
    "operationId": "projects/123/operations/456",
    "userId": "user-abc-123",
    "projectId": "proj-def-456",
    "status": "failed",
    "error": "Invalid prompt: content policy violation"
  }
}
```

---

## Security

### Signature Verification

All webhooks include an `X-Webhook-Signature` header containing an HMAC-SHA256 signature. Verify this signature to ensure the webhook is authentic.

#### Signature Generation

```
signature = HMAC-SHA256(payload, secret)
```

Where:

- `payload` is the raw JSON body
- `secret` is your webhook secret (from environment variables)
- Result is Base64-encoded

#### Verification Example (Node.js)

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('base64');

  // Use constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}

// Usage in webhook handler
export async function POST(req: NextRequest) {
  const signature = req.headers.get('X-Webhook-Signature');
  const rawBody = await req.text();
  const secret = process.env.WEBHOOK_SECRET!;

  if (!verifyWebhookSignature(rawBody, signature!, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  // Process webhook...
}
```

### Best Practices

1. **Always verify signatures** in production
2. **Use HTTPS** for webhook endpoints
3. **Store secrets securely** in environment variables
4. **Validate payload structure** before processing
5. **Implement idempotency** - webhooks may be delivered multiple times
6. **Log webhook events** for debugging and audit purposes

---

## Delivery & Retry

### Delivery Mechanism

Webhooks are delivered via HTTP POST with these headers:

```http
POST /api/webhooks/video HTTP/1.1
Host: your-domain.com
Content-Type: application/json
X-Webhook-Signature: <base64-signature>
X-Webhook-Event: video.generation.completed
User-Agent: NonLinearEditor-Webhook/1.0
```

### Success Criteria

A webhook delivery is considered successful when:

- Your endpoint returns HTTP status 2xx (200-299)
- Response received within 30 seconds

### Retry Strategy

If delivery fails, we automatically retry with exponential backoff:

| Attempt | Delay      | Total Elapsed |
| ------- | ---------- | ------------- |
| 1       | Immediate  | 0s            |
| 2       | ~1 second  | ~1s           |
| 3       | ~2 seconds | ~3s           |
| 4       | ~4 seconds | ~7s           |
| 5       | ~8 seconds | ~15s          |

**Maximum Retries:** 5 attempts

**Retry Conditions:**

- Network errors (connection timeout, DNS failure)
- HTTP 5xx errors (server errors)
- HTTP 408 (request timeout)
- HTTP 429 (too many requests)

**No Retry:**

- HTTP 4xx errors (except 408, 429)
- Invalid webhook URL

### Timeout

Each webhook delivery attempt has a 30-second timeout. Ensure your endpoint responds quickly.

### Jitter

We add 10% random jitter to retry delays to prevent thundering herd problems.

---

## Implementation Examples

### Example 1: Node.js/Express

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

app.post('/webhooks/video', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const secret = process.env.WEBHOOK_SECRET;

  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('base64');

  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process webhook
  const { event, data } = req.body;

  if (event === 'video.generation.completed') {
    console.log('Video generated:', data.result.assetId);
    // Update database, notify user, etc.
  } else if (event === 'video.generation.failed') {
    console.error('Video generation failed:', data.error);
    // Handle failure
  }

  // Acknowledge receipt
  res.json({ received: true });
});

app.listen(3000);
```

### Example 2: Next.js API Route

```typescript
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    // Verify signature
    const signature = req.headers.get('X-Webhook-Signature');
    const rawBody = await req.text();
    const secret = process.env.WEBHOOK_SECRET!;

    const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');

    if (!crypto.timingSafeEqual(Buffer.from(signature || ''), Buffer.from(expectedSignature))) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse and process webhook
    const payload = JSON.parse(rawBody);

    // Store webhook event
    await db.webhookEvents.create({
      event: payload.event,
      data: payload.data,
      receivedAt: new Date(),
    });

    // Handle event
    switch (payload.event) {
      case 'video.generation.completed':
        await handleVideoCompleted(payload.data);
        break;
      case 'video.generation.failed':
        await handleVideoFailed(payload.data);
        break;
      // ... other events
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleVideoCompleted(data: any) {
  // Update your database
  await db.assets.update({
    where: { id: data.result.assetId },
    data: { status: 'ready' },
  });

  // Notify user via email, push notification, etc.
  await sendNotification(data.userId, {
    title: 'Video Ready',
    message: 'Your video has been generated',
  });
}

async function handleVideoFailed(data: any) {
  // Log error
  console.error('Video generation failed:', data.error);

  // Notify user
  await sendNotification(data.userId, {
    title: 'Video Generation Failed',
    message: data.error,
  });
}
```

### Example 3: Python/Flask

```python
from flask import Flask, request, jsonify
import hmac
import hashlib
import json
import os

app = Flask(__name__)

@app.route('/webhooks/video', methods=['POST'])
def handle_webhook():
    # Verify signature
    signature = request.headers.get('X-Webhook-Signature')
    secret = os.environ['WEBHOOK_SECRET'].encode()

    expected_signature = hmac.new(
        secret,
        request.data,
        hashlib.sha256
    ).digest().hex()

    if not hmac.compare_digest(signature, expected_signature):
        return jsonify({'error': 'Invalid signature'}), 401

    # Process webhook
    payload = request.json
    event = payload['event']
    data = payload['data']

    if event == 'video.generation.completed':
        print(f"Video generated: {data['result']['assetId']}")
        # Handle completion
    elif event == 'video.generation.failed':
        print(f"Video generation failed: {data['error']}")
        # Handle failure

    return jsonify({'received': True})

if __name__ == '__main__':
    app.run(port=3000)
```

---

## Testing

### Testing in Development

Use a tool like [ngrok](https://ngrok.com/) to expose your local server:

```bash
# Start your local server
npm run dev

# In another terminal, start ngrok
ngrok http 3000

# Use the ngrok URL as your webhook_url
# e.g., https://abc123.ngrok.io/api/webhooks/video
```

### Testing with Mock Webhooks

Create a test script to simulate webhook delivery:

```typescript
// test-webhook.ts
import crypto from 'crypto';

const payload = {
  event: 'video.generation.completed',
  timestamp: new Date().toISOString(),
  data: {
    operationId: 'test-operation-123',
    userId: 'test-user',
    projectId: 'test-project',
    status: 'completed',
    result: {
      assetId: 'test-asset',
      storageUrl: 'test://storage',
    },
  },
};

const secret = 'your-webhook-secret';
const payloadString = JSON.stringify(payload);
const signature = crypto.createHmac('sha256', secret).update(payloadString).digest('base64');

fetch('http://localhost:3000/api/webhooks/video', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Webhook-Signature': signature,
    'X-Webhook-Event': payload.event,
  },
  body: payloadString,
})
  .then((res) => res.json())
  .then(console.log)
  .catch(console.error);
```

### Webhook Testing Tools

- **[ngrok](https://ngrok.com/)**: Expose local servers to the internet
- **[webhook.site](https://webhook.site/)**: Inspect webhook payloads
- **[RequestBin](https://requestbin.com/)**: Test and debug webhooks
- **[Postman](https://www.postman.com/)**: Test webhook endpoints

---

## Troubleshooting

### Common Issues

#### Webhook Not Received

**Possible Causes:**

- Webhook URL is incorrect or unreachable
- Firewall blocking incoming requests
- Endpoint not returning 2xx status code
- Endpoint timeout (> 30 seconds)

**Solutions:**

1. Verify webhook URL is accessible from the internet
2. Check firewall and security group settings
3. Ensure endpoint responds quickly (< 30 seconds)
4. Check server logs for errors
5. Test with tools like webhook.site

#### Signature Verification Fails

**Possible Causes:**

- Wrong webhook secret
- Modifying request body before verification
- Character encoding issues

**Solutions:**

1. Verify `WEBHOOK_SECRET` environment variable
2. Verify signature against raw request body (before parsing)
3. Ensure consistent character encoding (UTF-8)
4. Check for middleware modifying the request

#### Duplicate Webhooks

**Why It Happens:**
Webhooks may be delivered multiple times due to retries. This is expected behavior.

**Solution:**
Implement idempotency:

```typescript
const processedWebhooks = new Set<string>();

export async function POST(req: NextRequest) {
  const payload = await req.json();

  // Generate idempotency key
  const key = `${payload.event}-${payload.data.operationId}`;

  if (processedWebhooks.has(key)) {
    // Already processed
    return NextResponse.json({ received: true });
  }

  // Process webhook
  await handleWebhook(payload);

  // Mark as processed
  processedWebhooks.add(key);

  return NextResponse.json({ received: true });
}
```

Or use a database:

```typescript
// Check if webhook was already processed
const existing = await db.webhookEvents.findUnique({
  where: {
    operationId: payload.data.operationId,
  },
});

if (existing) {
  return NextResponse.json({ received: true });
}

// Process and store
await db.webhookEvents.create({
  data: {
    operationId: payload.data.operationId,
    event: payload.event,
    processedAt: new Date(),
  },
});
```

### Debugging

Enable detailed logging:

```typescript
export async function POST(req: NextRequest) {
  console.log('Webhook received:', {
    headers: Object.fromEntries(req.headers),
    url: req.url,
  });

  const rawBody = await req.text();
  console.log('Raw body:', rawBody);

  try {
    const payload = JSON.parse(rawBody);
    console.log('Parsed payload:', payload);

    // Process webhook...
  } catch (error) {
    console.error('Webhook processing error:', error);
    throw error;
  }
}
```

### Getting Help

If you're experiencing issues:

1. **Check server logs** for detailed error messages
2. **Verify webhook URL** is publicly accessible
3. **Test signature verification** with known payloads
4. **Monitor webhook delivery** in processing_jobs table:
   ```sql
   SELECT
     id,
     webhook_url,
     webhook_delivered_at,
     webhook_attempts,
     webhook_last_error
   FROM processing_jobs
   WHERE user_id = 'your-user-id'
   ORDER BY created_at DESC;
   ```

---

## Best Practices

### Security

1. **Always verify signatures** to prevent spoofed requests
2. **Use HTTPS** for all webhook endpoints
3. **Validate payload structure** before processing
4. **Rate limit** webhook endpoints to prevent abuse
5. **Store webhook secret securely** in environment variables

### Reliability

1. **Respond quickly** (< 1 second ideal, < 30 seconds maximum)
2. **Return 2xx status** to acknowledge receipt
3. **Process asynchronously** - queue webhook for background processing
4. **Implement idempotency** to handle duplicate deliveries
5. **Log all webhooks** for debugging and audit trails

### Performance

1. **Use queues** for time-consuming tasks
2. **Batch database updates** when possible
3. **Cache frequently accessed data**
4. **Monitor webhook processing time**

### Example: Background Processing

```typescript
import { Queue } from 'bull';

const webhookQueue = new Queue('webhooks');

export async function POST(req: NextRequest) {
  // Verify signature...
  const payload = await req.json();

  // Queue for background processing
  await webhookQueue.add(payload);

  // Respond immediately
  return NextResponse.json({ received: true });
}

// Background worker
webhookQueue.process(async (job) => {
  const payload = job.data;

  // Process webhook (may take minutes)
  await processWebhook(payload);
});
```

---

## Summary

- Webhooks eliminate polling for long-running operations
- Include `webhook_url` parameter when starting operations
- Verify signatures to ensure authenticity
- Return 2xx status code within 30 seconds
- Implement idempotency to handle retries
- Use HTTPS in production

For questions or issues, please refer to the main [API Documentation](./API_DOCUMENTATION.md).

---

**End of Webhook Documentation**

_Last Updated: 2025-10-24_
