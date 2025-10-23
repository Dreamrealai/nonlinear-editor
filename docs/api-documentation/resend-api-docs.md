# Resend API Documentation

Complete reference documentation for the Resend Email API, compiled from official documentation at https://resend.com/docs/introduction

---

## Table of Contents

1. [Introduction](#introduction)
2. [Authentication](#authentication)
3. [Send Email Endpoint](#send-email-endpoint)
4. [Rate Limits](#rate-limits)
5. [Error Codes](#error-codes)
6. [Domain Verification](#domain-verification)
7. [Webhooks](#webhooks)
8. [Best Practices](#best-practices)

---

## Introduction

### Base URL

The Resend API is built on **REST** principles and enforces **HTTPS** in every request to improve data security, integrity, and privacy. The API does not support **HTTP**.

```
https://api.resend.com
```

### Response Codes

Resend uses standard HTTP codes to indicate the success or failure of requests:

| Status Code | Description |
|-------------|-------------|
| `200` | Successful request |
| `400` | Check that the parameters were correct |
| `401` | The API key used was missing |
| `403` | The API key used was invalid |
| `404` | The resource was not found |
| `429` | The rate limit was exceeded |
| `5xx` | Indicates an error with Resend servers |

### API Versioning

Currently, there is no versioning system in place. Resend plans to add versioning via calendar-based headers in the future.

---

## Authentication

To authenticate, you need to add an `Authorization` header with a Bearer token containing your API Key.

### Header Format

```
Authorization: Bearer re_xxxxxxxxx
```

### Obtaining API Keys

API keys can be generated from the [Resend Dashboard](https://resend.com/api-keys).

### API Key Types

- **Full Access**: Can perform all API operations including sending emails and managing resources
- **Sending Access**: Restricted to only sending emails

### Security Notes

- Keep your API keys secure and never expose them in client-side code
- Use environment variables to store API keys
- Rotate API keys regularly for security
- Use sending-access keys when only email sending is required

---

## Send Email Endpoint

Send emails through the Resend Email API.

### Endpoint

```
POST /emails
```

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | string | Sender email address. Format: `"Your Name <sender@domain.com>"` or `sender@domain.com` |
| `to` | string \| string[] | Recipient email address(es). Max 50 recipients. |
| `subject` | string | Email subject line |

### Optional Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `bcc` | string \| string[] | Blind carbon copy recipient(s) |
| `cc` | string \| string[] | Carbon copy recipient(s) |
| `replyTo` | string \| string[] | Reply-to email address(es) |
| `html` | string | HTML version of the message |
| `text` | string | Plain text version. If not provided, HTML will be converted to plain text automatically. Set to empty string `""` to opt out of automatic conversion. |
| `react` | React.ReactNode | React component for email (Node.js SDK only) |
| `scheduledAt` | string | Schedule email for later delivery. Accepts natural language (e.g., "in 1 min") or ISO 8601 format (e.g., "2024-08-05T11:52:01.858Z") |
| `headers` | object | Custom headers to add to the email |
| `attachments` | array | File attachments (max 40MB per email after Base64 encoding) |
| `tags` | array | Custom key/value pairs for categorization |
| `template` | object | Template configuration (private beta) |

### Attachments

Each attachment object can contain:

| Property | Type | Description |
|----------|------|-------------|
| `content` | buffer \| string | Content as buffer or Base64 string |
| `filename` | string | Name of the attached file |
| `path` | string | Path where the attachment file is hosted |
| `contentType` | string | MIME type (derived from filename if not set) |
| `contentId` | string | ID for embedding images inline using `<img src="cid:...">` |

### Tags

Each tag object contains:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | Tag name. ASCII letters (a-z, A-Z), numbers (0-9), underscores (_), or dashes (-). Max 256 characters. |
| `value` | string | Yes | Tag value. ASCII letters (a-z, A-Z), numbers (0-9), underscores (_), or dashes (-). Max 256 characters. |

### Templates (Private Beta)

To send using a template:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes | ID of the published template. Only published templates can be used. |
| `variables` | object | No | Template variables as key/value pairs |

**Template Variable Rules:**
- Key: Max 50 characters, letters, numbers, and underscores only
- Value types: string (max 50 chars), number (≤ 2^53 - 1), boolean, object (max 50 keys), list (max 50 indexes)

**Note**: When using templates, you cannot send `html`, `text`, or `react` in the payload.

### Headers

| Header | Type | Description |
|--------|------|-------------|
| `Idempotency-Key` | string | Unique key to prevent duplicate emails. Expires after 24 hours. Max 256 characters. Should be unique per API request. |

### Example Request (Node.js)

```javascript
import { Resend } from 'resend';

const resend = new Resend('re_xxxxxxxxx');

const { data, error } = await resend.emails.send({
  from: 'Acme <onboarding@resend.dev>',
  to: ['delivered@resend.dev'],
  subject: 'hello world',
  html: '<p>it works!</p>',
  replyTo: 'onboarding@resend.dev',
});
```

### Example Request (cURL)

```bash
curl -X POST https://api.resend.com/emails \
  -H 'Authorization: Bearer re_xxxxxxxxx' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "Acme <onboarding@resend.dev>",
    "to": ["delivered@resend.dev"],
    "subject": "hello world",
    "html": "<p>it works!</p>"
  }'
```

### Success Response

```json
{
  "id": "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794"
}
```

### Example with Attachments

```javascript
const { data, error } = await resend.emails.send({
  from: 'Acme <onboarding@resend.dev>',
  to: ['delivered@resend.dev'],
  subject: 'Invoice',
  html: '<p>Please find your invoice attached.</p>',
  attachments: [
    {
      filename: 'invoice.pdf',
      content: Buffer.from(pdfData),
      contentType: 'application/pdf'
    }
  ]
});
```

### Example with Tags

```javascript
const { data, error } = await resend.emails.send({
  from: 'Acme <onboarding@resend.dev>',
  to: ['delivered@resend.dev'],
  subject: 'Welcome',
  html: '<p>Welcome to our service!</p>',
  tags: [
    { name: 'category', value: 'onboarding' },
    { name: 'user_type', value: 'new_user' }
  ]
});
```

### Example with Idempotency Key

```javascript
const { data, error } = await resend.emails.send({
  from: 'Acme <onboarding@resend.dev>',
  to: ['delivered@resend.dev'],
  subject: 'Order Confirmation',
  html: '<p>Your order has been confirmed.</p>',
}, {
  headers: {
    'Idempotency-Key': 'unique-order-id-12345'
  }
});
```

---

## Rate Limits

### Default Rate Limit

The default maximum rate limit is **2 requests per second**. This can be increased for trusted senders by request.

### Rate Limit Headers

Every API response includes rate limit information in the headers (conforming to [IETF standard draft](https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-ratelimit-headers-06)):

| Header | Description |
|--------|-------------|
| `ratelimit-limit` | Maximum number of requests allowed within a window |
| `ratelimit-remaining` | Requests remaining in the current window |
| `ratelimit-reset` | Seconds until the limits are reset |
| `retry-after` | Seconds to wait before making a follow-up request |

### Handling Rate Limits

When you exceed the rate limit, you'll receive a `429` response error code.

**Best practices:**
- Implement a queue mechanism to manage request flow
- Reduce the number of concurrent requests per second
- Use exponential backoff for retries
- Monitor rate limit headers to adjust request patterns
- Contact support to request rate increases if needed

### Checking Rate Limit Violations

You can find all 429 responses by filtering for status code 429 in the [Resend Logs page](https://resend.com/logs?status=429).

---

## Error Codes

### Error Response Schema

All errors include a `name` and `message` field describing the error.

### Complete Error Reference

#### `invalid_idempotency_key`
- **Status:** 400
- **Message:** The key must be between 1-256 chars
- **Action:** Retry with a valid idempotency key

#### `validation_error` (400)
- **Status:** 400
- **Message:** Error with one or more fields in the request
- **Action:** Check the error message for specific field errors

#### `missing_api_key`
- **Status:** 401
- **Message:** Missing API key in the authorization header
- **Action:** Include `Authorization: Bearer YOUR_API_KEY` header

#### `restricted_api_key`
- **Status:** 401
- **Message:** This API key is restricted to only send emails
- **Action:** Use an API key with "Full access" for non-sending operations

#### `invalid_api_key`
- **Status:** 403
- **Message:** API key is invalid
- **Action:** Verify API key or generate a new one from the dashboard

#### `validation_error` (403)
- **Status:** 403
- **Message:** You can only send testing emails to your own email address
- **Action:** Verify a domain in the dashboard to send to any address

#### `not_found`
- **Status:** 404
- **Message:** The requested endpoint does not exist
- **Action:** Verify the API endpoint URL

#### `method_not_allowed`
- **Status:** 405
- **Message:** Method is not allowed for the requested path
- **Action:** Use the correct HTTP method for the endpoint

#### `invalid_idempotent_request`
- **Status:** 409
- **Message:** Same idempotency key used with different request payload
- **Action:** Change idempotency key or payload

#### `concurrent_idempotent_requests`
- **Status:** 409
- **Message:** Same idempotency key used while original request is still in progress
- **Action:** Wait for the original request to complete

#### `invalid_attachment`
- **Status:** 422
- **Message:** Attachment must have either `content` or `path`
- **Action:** Provide either content (Buffer/string) or path to remote resource

#### `invalid_from_address`
- **Status:** 422
- **Message:** Invalid `from` field
- **Action:** Use format `email@example.com` or `Name <email@example.com>`

#### `invalid_access`
- **Status:** 422
- **Message:** Access must be "full_access" | "sending_access"
- **Action:** Verify API key has necessary permissions

#### `invalid_parameter`
- **Status:** 422
- **Message:** The parameter must be a valid UUID
- **Action:** Check parameter value for validity

#### `invalid_region`
- **Status:** 422
- **Message:** Region must be "us-east-1" | "eu-west-1" | "sa-east-1"
- **Action:** Use a supported region

#### `missing_required_field`
- **Status:** 422
- **Message:** Request body is missing required fields
- **Action:** Check error message for list of missing fields

#### `monthly_quota_exceeded`
- **Status:** 429
- **Message:** Monthly email sending quota reached
- **Action:** Upgrade plan to increase monthly sending limit

#### `daily_quota_exceeded`
- **Status:** 429
- **Message:** Daily email sending quota reached
- **Action:** Upgrade plan or wait 24 hours to continue sending

#### `rate_limit_exceeded`
- **Status:** 429
- **Message:** Too many requests
- **Action:** Read response headers and reduce request rate. Contact support for rate increase.

#### `security_error`
- **Status:** 451
- **Message:** Security issue detected with the request
- **Action:** Review error message details and contact support

#### `application_error`
- **Status:** 500
- **Message:** Unexpected error occurred
- **Action:** Retry request. Check [status page](https://resend-status.com/) if error persists

#### `internal_server_error`
- **Status:** 500
- **Message:** Unexpected error occurred
- **Action:** Retry request. Check [status page](https://resend-status.com/) if error persists

---

## Domain Verification

### Overview

Resend sends emails using a domain you own. Domain verification is required to send emails to addresses beyond your own.

### Subdomain Recommendation

It's recommended to use subdomains (e.g., `updates.yourdomain.com`) to:
- Isolate your sending reputation
- Clearly communicate intent
- Protect your root domain reputation

### Required DNS Records

To verify a domain, you must set two DNS entries:

#### 1. SPF (Sender Policy Framework)
- **Type:** TXT record
- **Purpose:** Lists IP addresses authorized to send email on behalf of your domain
- **Additional:** MX record for bounce and complaint feedback

#### 2. DKIM (DomainKeys Identified Mail)
- **Type:** TXT record
- **Purpose:** Public key used to verify email authenticity

### Domain Verification Process

1. Add your domain in the [Resend Domains Dashboard](https://resend.com/domains)
2. Add the provided SPF and DKIM records to your DNS
3. Click "Verify DNS Records" in the dashboard
4. Wait for verification (usually a few minutes, up to 72 hours)

### Domain Statuses

| Status | Description |
|--------|-------------|
| `not_started` | Domain added but verification not initiated |
| `pending` | Resend is verifying the domain |
| `verified` | Domain successfully verified for sending |
| `failed` | Unable to detect DNS records within 72 hours |
| `temporary_failure` | Previously verified domain no longer detectable. Resend will recheck for 72 hours. |

### Custom Return Path

By default, Resend uses the `send` subdomain for the Return-Path address. You can customize this:

**Via API:**
```javascript
resend.domains.create({
  name: 'example.com',
  customReturnPath: 'outbound'
});
```

**Custom Return Path Rules:**
- Max 63 characters
- Must start with a letter
- Must end with a letter or number
- Can contain only letters, numbers, and hyphens
- Avoid values that undermine credibility (e.g., "testing")

### SPF Record Details

SPF configuration includes:
- TXT record listing approved IP addresses
- MX record for recipient bounce/complaint feedback

### DKIM Record Details

DKIM configuration includes:
- TXT record with public key for email authenticity verification

### Optional: DMARC Record

After SPF and DKIM verify, you can optionally add a DMARC record to build additional trust with mailbox providers.

### Open and Click Tracking

Open and click tracking is **disabled by default** for all domains. You can enable it in domain settings.

#### How Open Tracking Works
- 1x1 pixel transparent GIF inserted in each email
- Unique reference tracks when image is downloaded
- Identifies which message was opened and by whom

#### How Click Tracking Works
- Modifies each link in HTML email
- Recipients are sent to Resend server first
- Immediately redirected to URL destination
- Tracks click events

**Important:** For best deliverability, disable click and open tracking for sensitive transactional emails.

### Domain Requirements

- You must own the domain (not shared or public domains)
- DNS access is required for verification
- Proper DNS configuration is essential

---

## Webhooks

### Overview

Resend uses webhooks to push real-time notifications about email sending events via HTTPS POST requests with JSON payloads.

### Use Cases

- Automatically remove bounced email addresses from mailing lists
- Create alerts in messaging or incident tools based on event types
- Store all send events in your database for custom reporting/retention

### Setup Steps

#### 1. Create Local Endpoint

Create a route that accepts POST requests:

```typescript
// Example: pages/api/webhooks.ts (Next.js)
import type { NextApiRequest, NextApiResponse } from 'next';

export default (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const payload = req.body;
    console.log(payload);
    res.status(200).send('OK');
  }
};
```

**Important:** Always respond with `HTTP 200 OK` to signal successful delivery.

#### 2. Register Development Webhook

For development, create a public tunnel to your localhost:
- Use [ngrok](https://ngrok.com/download)
- Use [VS Code Port Forwarding](https://code.visualstudio.com/docs/debugtest/port-forwarding)

Example URL: `https://example123.ngrok.io/api/webhook`

Register the URL in the [Resend Dashboard](https://resend.com/webhooks).

#### 3. Test Webhook

Send test emails to verify your webhook endpoint is receiving events. Check the webhook events list in the dashboard.

#### 4. Deploy to Production

Deploy your webhook endpoint to your production environment.

#### 5. Register Production Webhook

Register your production webhook URL in the Resend dashboard.

### Webhook Retry Schedule

If Resend does not receive a 200 response, webhooks are retried on this schedule:

1. 5 seconds
2. 5 minutes
3. 30 minutes
4. 2 hours
5. 5 hours
6. 10 hours

After all retries fail, the message is marked as failed and you receive a `message.attempt.exhausted` webhook.

### Webhook IP Addresses

Webhooks POST from these IP addresses (for allowlist configuration):

- `44.228.126.217`
- `50.112.21.217`
- `52.24.126.164`
- `54.148.139.208`
- `2600:1f24:64:8000::/52`

### Manual Retry

You can manually retry webhook events from the dashboard:
1. View webhook details
2. Click the event you want to retry
3. View payload and click the replay button

### Webhook Security

- Use HTTPS endpoints only
- Verify webhook signatures (if implemented)
- Validate payload structure before processing
- Implement idempotent event handling
- Log all webhook events for debugging

### Example Webhook Code

See [webhook code example](https://github.com/resend/resend-examples/tree/main/with-webhooks) for implementation guidance.

---

## Best Practices

### Authentication
- Store API keys in environment variables
- Never expose API keys in client-side code
- Use sending-access keys when only sending is required
- Rotate API keys regularly
- Keep separate keys for development and production

### Sending Emails
- Use subdomains for sending (e.g., `updates.yourdomain.com`)
- Verify your domain before production use
- Implement proper error handling
- Use idempotency keys for critical emails (order confirmations, payments)
- Provide both HTML and plain text versions
- Validate email addresses before sending
- Respect bounce and complaint notifications

### Rate Limiting
- Implement request queuing to stay under rate limits
- Monitor rate limit headers in responses
- Use exponential backoff for retries
- Contact support for rate increases if needed
- Batch operations when possible

### Domain Management
- Verify SPF and DKIM records properly
- Use custom return paths for branding
- Disable click/open tracking for transactional emails
- Monitor domain status regularly
- Set up DMARC after SPF/DKIM verification

### Email Content
- Keep attachments under 40MB total (after Base64 encoding)
- Use tags for categorization and analytics
- Implement proper unsubscribe mechanisms
- Follow CAN-SPAM and GDPR guidelines
- Test emails before production use

### Webhooks
- Always respond with HTTP 200 OK
- Implement idempotent event handling
- Validate webhook payloads
- Secure webhook endpoints (use secrets if available)
- Handle retry events gracefully
- Log webhook events for debugging

### Error Handling
- Implement proper try-catch blocks
- Log all API errors with context
- Handle rate limit errors with backoff
- Provide user-friendly error messages
- Monitor error rates and types

### Testing
- Use test mode API keys during development
- Test with various email clients
- Verify rendering on mobile and desktop
- Test spam score before production
- Validate email authentication (SPF, DKIM, DMARC)

### Monitoring
- Track email delivery rates
- Monitor bounce and complaint rates
- Set up alerts for quota limits
- Review webhook events regularly
- Analyze email performance metrics

### Performance
- Use batch sending for multiple recipients when appropriate
- Implement caching for templates
- Optimize attachment sizes
- Use CDN for email images
- Monitor API response times

### Security
- Validate all input data
- Sanitize HTML content
- Protect against email injection
- Implement rate limiting on your side
- Secure webhook endpoints
- Use HTTPS for all API requests
- Monitor for suspicious activity

### Compliance
- Implement proper unsubscribe handling
- Respect user preferences
- Follow anti-spam regulations (CAN-SPAM, GDPR)
- Maintain email preference centers
- Keep audit logs of sent emails
- Provide clear sender identification
- Honor opt-out requests immediately

---

## Additional Resources

- **Official Documentation:** https://resend.com/docs
- **API Reference:** https://resend.com/docs/api-reference
- **Dashboard:** https://resend.com/dashboard
- **Status Page:** https://resend-status.com
- **Support:** https://resend.com/contact
- **GitHub Examples:** https://github.com/resend/resend-examples
- **Knowledge Base:** https://resend.com/docs/knowledge-base

---

## Summary

Resend provides a modern, developer-friendly email API with:
- Simple REST API with HTTPS-only communication
- Comprehensive error handling and detailed error messages
- Built-in rate limiting with clear headers
- Domain verification with SPF/DKIM support
- Real-time webhook notifications
- Flexible email sending with templates, attachments, and scheduling
- Robust authentication and security features

For integration into your application, follow the authentication, domain verification, and sending best practices outlined in this documentation.
