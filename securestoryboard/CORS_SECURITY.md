# CORS Security Configuration

## Overview

All Netlify Functions in this project have been updated to use secure CORS (Cross-Origin Resource Sharing) configuration. The wildcard (`*`) origin has been replaced with explicit origin validation to prevent unauthorized access.

## Security Implementation

### 1. CORS Validation Library

Location: `lib/cors.js`

This module provides:
- **Origin Validation**: Only allows requests from explicitly whitelisted origins
- **Environment-based Configuration**: Origins are configured via environment variables
- **Security Logging**: Logs rejected origins for security monitoring
- **Fallback Protection**: Never returns wildcard, always uses validated or default origins

Key functions:
- `getCorsHeaders(event, options)` - Get validated CORS headers
- `validateOrigin(origin)` - Validate if origin is allowed
- `isOriginAllowed(event)` - Check if request origin is permitted
- `createCorsErrorResponse(event)` - Create proper error response for rejected origins

### 2. Updated API Helpers

Location: `netlify/functions/utils/api-helpers.js`

The helper functions now accept an `event` parameter to enable origin validation:
- `getCorsHeaders(event)` - Returns validated CORS headers
- `errorResponse(..., event)` - Returns error response with validated CORS
- `successResponse(..., event)` - Returns success response with validated CORS
- `optionsResponse(event)` - Returns OPTIONS response with validated CORS

### 3. Configuration

**Environment Variable**: `ALLOWED_ORIGINS`

Format: Comma-separated list of allowed origin URLs

Examples:
```bash
# Development (default if not set)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Production
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Multiple environments
ALLOWED_ORIGINS=https://app.example.com,https://staging.example.com,https://example.com
```

**Important**:
- Always use complete URLs with protocol (http:// or https://)
- No trailing slashes
- No wildcards allowed
- If not set, defaults to localhost origins only

### 4. Updated Functions

All Netlify functions have been updated:

**Main Functions:**
- ✅ auth.js
- ✅ chat.js
- ✅ generate-images.js
- ✅ generate-prompts.js
- ✅ analyze-video.js
- ✅ generate-summaries.js
- ✅ search-client-ads.js
- ✅ start-video-analysis.js
- ✅ check-video-analysis.js

**Prompt Generation Functions:**
- ✅ generate-prompts-start.js
- ✅ generate-prompts-stream.js
- ✅ generate-prompts-streaming.js
- ✅ generate-prompts-async.js
- ✅ generate-prompts-async-v2.js
- ✅ generate-prompts-async-handler.js
- ✅ generate-prompts-check.js
- ✅ generate-prompts-simple.js
- ✅ generate-prompts-universal.js
- ✅ generate-prompts-webhook.js
- ✅ generate-prompts-webhook-v2.js
- ✅ process-prompt-webhook-v2.js
- ✅ generate-prompts-original.js

**Utility Functions:**
- ✅ get-tool-instructions.js
- ✅ test-blobs-status.js

**Archived Functions:**
- ✅ _archived_test-blobs.js

## Usage Examples

### Example 1: Using in a function with api-helpers

```javascript
const {
  errorResponse,
  successResponse,
  optionsResponse
} = require('./utils/api-helpers');

exports.handler = async (event, context) => {
  // Handle OPTIONS for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return optionsResponse(event);
  }

  try {
    // Your logic here
    const result = { message: 'Success' };
    return successResponse(result, 200, event);
  } catch (error) {
    return errorResponse(500, 'Error', error.message, 'error', null, event);
  }
};
```

### Example 2: Using CORS headers directly

```javascript
const { getCorsHeaders } = require('../../lib/cors');

exports.handler = async (event, context) => {
  const headers = {
    ...getCorsHeaders(event, {
      allowCredentials: true,
      allowedMethods: 'POST, OPTIONS',
      allowedHeaders: 'Content-Type'
    }),
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Your logic here
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: 'Success' })
  };
};
```

### Example 3: Additional origin validation

```javascript
const { getCorsHeaders, isOriginAllowed, createCorsErrorResponse } = require('../../lib/cors');

exports.handler = async (event, context) => {
  // Check origin before processing
  if (!isOriginAllowed(event)) {
    return createCorsErrorResponse(event);
  }

  const headers = {
    ...getCorsHeaders(event),
    'Content-Type': 'application/json'
  };

  // Your logic here
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: 'Success' })
  };
};
```

## Deployment Checklist

Before deploying to production:

1. **Update Environment Variables**
   - [ ] Set `ALLOWED_ORIGINS` in Netlify dashboard
   - [ ] Include all production domains
   - [ ] Include staging domains if applicable

2. **Test CORS Configuration**
   - [ ] Test from allowed origins
   - [ ] Verify rejected origins return 403
   - [ ] Check browser console for CORS errors
   - [ ] Verify OPTIONS preflight requests work

3. **Monitor Security**
   - [ ] Check function logs for rejected origins
   - [ ] Monitor for unauthorized access attempts
   - [ ] Update allowed origins as needed

## Security Benefits

1. **Prevents Unauthorized Access**: Only whitelisted origins can access your API
2. **Audit Trail**: All rejected origins are logged for security monitoring
3. **No Wildcards**: Eliminates the security risk of accepting all origins
4. **Flexible Configuration**: Easy to update allowed origins via environment variables
5. **Fail-Safe Defaults**: Falls back to localhost if no configuration is provided

## Troubleshooting

### CORS Error: Origin not allowed

**Cause**: The requesting origin is not in the `ALLOWED_ORIGINS` list

**Solution**:
1. Check the request origin in browser console
2. Add the origin to `ALLOWED_ORIGINS` environment variable
3. Redeploy or restart the function

### No CORS headers in response

**Cause**: Function is not using the updated CORS helpers

**Solution**:
1. Ensure the function imports `getCorsHeaders` from `lib/cors.js`
2. Pass the `event` parameter to CORS helper functions
3. Verify the function returns CORS headers in the response

### CORS works locally but not in production

**Cause**: `ALLOWED_ORIGINS` not set in production environment

**Solution**:
1. Set `ALLOWED_ORIGINS` in Netlify environment variables
2. Include production domain(s)
3. Redeploy the site

## Additional Resources

- [MDN CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- [OWASP CORS Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Origin_Resource_Sharing_Cheat_Sheet.html)
