# API Versioning Strategy

## Overview

The Non-Linear Video Editor API uses **path-based versioning** to ensure backward compatibility and smooth transitions between API versions. This document outlines our versioning strategy, implementation, and best practices.

## Versioning Approach

### Path-Based Versioning

We use path-based versioning where the API version is included in the URL path:

```
/api/v1/projects
/api/v1/video/generate
/api/v2/projects (future)
```

**Benefits:**

- Clear and explicit version in the URL
- Easy to route and cache
- Version-specific documentation
- No ambiguity about which version is being used

### Version Header Support

In addition to path-based versioning, clients can optionally specify the version via header:

```http
X-API-Version: v1
```

This header is primarily used for:

- Version negotiation
- Monitoring and analytics
- Gradual migration tracking

## Version Lifecycle

Each API version follows this lifecycle:

### 1. Development (Pre-release)

- Version is under active development
- Breaking changes allowed
- Not recommended for production use
- Header: `X-API-Stability: development`

### 2. Stable (Current)

- Version is production-ready
- No breaking changes
- Full support and maintenance
- Default version for new integrations
- Header: `X-API-Stability: stable`

### 3. Deprecated

- Version is marked for removal
- No new features
- Only critical bug fixes
- Deprecation warnings in responses
- Header: `X-API-Deprecation-Warning: This version will be sunset on YYYY-MM-DD`

### 4. Sunset (Removed)

- Version is no longer available
- Requests return 410 Gone
- Migration guide provided

## Current API Versions

| Version | Status | Release Date | Sunset Date | Notes                  |
| ------- | ------ | ------------ | ----------- | ---------------------- |
| v1      | Stable | 2025-10-23   | TBD         | Current stable version |

## Version Headers

All API responses include version-related headers:

### Response Headers

```http
X-API-Version: v1
X-API-Stability: stable
```

For deprecated versions:

```http
X-API-Version: v1
X-API-Deprecation-Warning: This version will be sunset on 2026-12-31
Sunset: Wed, 31 Dec 2026 23:59:59 GMT
```

## Breaking Changes Policy

### What Constitutes a Breaking Change?

The following changes require a new API version:

1. **Removing fields** from responses
2. **Renaming fields** in requests or responses
3. **Changing field types** (e.g., string to integer)
4. **Changing validation rules** that make previously valid requests invalid
5. **Removing API endpoints**
6. **Changing HTTP status codes** for existing scenarios
7. **Changing authentication requirements**

### What is NOT a Breaking Change?

The following changes can be made within an existing version:

1. **Adding new optional fields** to requests
2. **Adding new fields** to responses (clients should ignore unknown fields)
3. **Adding new API endpoints**
4. **Relaxing validation rules** (making previously invalid requests valid)
5. **Adding new error codes**
6. **Improving error messages**
7. **Performance improvements**
8. **Bug fixes** that correct incorrect behavior

## Migration Guide

### Planning a Version Migration

When introducing a new API version:

1. **Announce the new version** at least 3 months before release
2. **Provide migration guide** with code examples
3. **Maintain both versions** for at least 6 months
4. **Send deprecation notices** 3 months before sunset
5. **Monitor usage metrics** for the old version
6. **Sunset the old version** with proper notice

### Example Migration Timeline

```
Month 0: v2 announcement
Month 1: v2 beta release
Month 2: v2 stable release
Month 3: v1 deprecation notice
Month 6: v1 sunset warning (30 days)
Month 7: v1 sunset
```

## Implementation Details

### Creating a New Version

To create a new API version:

1. **Create version directory**:

   ```
   /app/api/v2/
   ```

2. **Update version configuration** in `/lib/api/versioning.ts`:

   ```typescript
   export const API_VERSIONS: Record<string, VersionConfig> = {
     v1: {
       version: '1',
       stable: true,
       deprecated: false,
     },
     v2: {
       version: '2',
       stable: true,
       deprecated: false,
     },
   };
   ```

3. **Copy and modify routes** from previous version
4. **Update OpenAPI spec** to include new version
5. **Update documentation**

### Deprecating a Version

To deprecate a version:

1. **Update version configuration**:

   ```typescript
   deprecateVersion('v1', 'Use v2 instead', '2026-12-31T00:00:00Z');
   ```

2. **Send email notifications** to API users
3. **Update documentation** with migration guide
4. **Monitor usage** via analytics
5. **Provide deprecation timeline**

### Sunsetting a Version

To sunset a version:

1. **Remove version directory** (e.g., `/app/api/v1/`)
2. **Update version configuration** to mark as removed
3. **Add sunset middleware** that returns 410 Gone
4. **Redirect to migration guide**

## Best Practices for API Consumers

### 1. Always Specify Version

Use explicit version in URLs:

```typescript
// Good
fetch('/api/v1/projects');

// Bad (relies on default, may change)
fetch('/api/projects');
```

### 2. Handle Unknown Fields

Ignore unknown fields in responses:

```typescript
const { id, title, ...rest } = response;
// Ignore `rest`, only use known fields
```

### 3. Monitor Deprecation Headers

Check for deprecation warnings:

```typescript
const deprecationWarning = response.headers.get('X-API-Deprecation-Warning');
if (deprecationWarning) {
  console.warn('API version is deprecated:', deprecationWarning);
  // Alert your team to plan migration
}
```

### 4. Use Semantic Versioning for Client Libraries

Client libraries should follow semantic versioning:

- Major version = API version (e.g., 1.x.x for v1 API)
- Minor version = New features (backward compatible)
- Patch version = Bug fixes

### 5. Test Against Multiple Versions

During migration, test against both old and new versions:

```typescript
// Integration tests
describe('API v1', () => {
  /* tests */
});
describe('API v2', () => {
  /* tests */
});
```

## Validation and Consistency

### Request Validation

All API endpoints enforce consistent validation:

1. **Body size limits** (prevents DoS attacks)
   - Tiny: 1KB (auth)
   - Small: 10KB (forms)
   - Medium: 100KB (JSON data)
   - Large: 1MB (rich content)
   - XLarge: 10MB (batch operations)

2. **Input sanitization** (prevents injection attacks)
   - String sanitization
   - HTML stripping
   - SQL pattern removal
   - UUID validation
   - Email validation
   - URL validation

3. **Field-level validation**
   - Type checking
   - Range validation
   - Format validation
   - Required field validation

### Error Response Format

All errors follow a consistent format across versions:

```json
{
  "error": "Validation failed",
  "field": "projectId",
  "details": {
    "expected": "UUID",
    "received": "invalid-id"
  }
}
```

## Rate Limiting

Rate limits are consistent across API versions:

| Tier   | Limit   | Use Case                         |
| ------ | ------- | -------------------------------- |
| Tier 1 | 100/min | Data retrieval (GET)             |
| Tier 2 | 10/min  | Resource creation (POST)         |
| Tier 3 | 5/min   | Heavy operations (export, batch) |

Rate limit headers are included in all responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2025-10-23T12:01:00Z
Retry-After: 60
```

## Compression and Caching

### Response Compression

The API automatically compresses responses using gzip:

- Enabled for responses > 1KB
- `Content-Encoding: gzip` header included
- Configurable via Next.js config

### ETag Support

ETags are generated for cacheable resources:

- Enabled for GET requests
- `ETag: "abc123"` header included
- Clients can use `If-None-Match` for conditional requests
- Returns 304 Not Modified when unchanged

### Cache Headers

Appropriate cache headers are set:

- Static content: `Cache-Control: public, max-age=31536000, immutable`
- API responses: `Cache-Control: public, max-age=60, s-maxage=300`
- User-specific: `Cache-Control: private, max-age=60`

## OpenAPI Documentation

Full API documentation is available in OpenAPI 3.0 format:

### Access Documentation

1. **Interactive UI**: Visit `/docs` for Swagger UI interface
2. **OpenAPI Spec (YAML)**: Download from `/api/docs?format=yaml`
3. **OpenAPI Spec (JSON)**: Download from `/api/docs?format=json`

### Generating Client SDKs

Use the OpenAPI spec to generate client libraries:

```bash
# TypeScript/JavaScript
npx openapi-typescript-codegen --input /api/docs --output ./src/api

# Python
pip install openapi-generator-cli
openapi-generator-cli generate -i /api/docs -g python -o ./python-client

# Go
openapi-generator-cli generate -i /api/docs -g go -o ./go-client
```

## Monitoring and Analytics

### Version Usage Tracking

Monitor version usage via:

1. Response headers (`X-API-Version`)
2. Server logs (structured logging)
3. Analytics dashboards

### Deprecation Metrics

Track deprecation warnings:

1. Number of requests to deprecated versions
2. Unique users still using deprecated versions
3. Most-used deprecated endpoints

### Migration Progress

Monitor migration progress:

1. Percentage of requests on new version
2. Unique users migrated
3. Time to full migration

## Support and Communication

### API Changelog

Maintain a detailed changelog:

- Breaking changes highlighted
- New features documented
- Bug fixes listed
- Migration guides included

### API Status Page

Provide real-time status:

- Current version status
- Planned maintenance
- Deprecation notices
- Incident reports

### Developer Communication

Keep developers informed:

- Email notifications for deprecations
- In-app banners for breaking changes
- Deprecation warnings in responses
- Migration deadlines

## Conclusion

This versioning strategy ensures:

- **Backward compatibility** for existing integrations
- **Smooth migrations** with proper notice
- **Clear communication** about changes
- **Consistent API experience** across versions
- **Stable production environment** for all users

For questions or feedback, contact the API team at api@example.com.
