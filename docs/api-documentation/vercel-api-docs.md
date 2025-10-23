# Vercel REST API Documentation

> Comprehensive reference for Vercel REST API endpoints, authentication, deployments, projects, environment variables, and CI/CD best practices.

**Last Updated:** October 23, 2025
**API Version:** v13 (varies by endpoint)
**Base URL:** `https://api.vercel.com`

---

## Table of Contents

- [API Basics](#api-basics)
- [Authentication](#authentication)
- [Deployments](#deployments)
- [Projects](#projects)
- [Environment Variables](#environment-variables)
- [Rate Limits](#rate-limits)
- [Error Codes](#error-codes)
- [Pagination](#pagination)
- [Next.js Specific Features](#nextjs-specific-features)
- [CI/CD Best Practices](#cicd-best-practices)

---

## API Basics

### Base URL and Protocols

- **Base URL:** `https://api.vercel.com`
- **Protocol:** HTTP/1, HTTP/1.1, and HTTP/2 (HTTP/2 preferred)
- **TLS:** TLS 1.2 and 1.3 supported, with resumption
- **Content-Type:** All requests must use `Content-Type: application/json`
- **Response Format:** All responses are JSON encoded

### Server Specifications

- HTTP versions: 1, 1.1, and 2
- TLS: 1.2 and 1.3 with resumption
- All endpoints follow REST architecture

---

## Authentication

### Bearer Token Authentication

All API requests require authentication using Bearer tokens:

```bash
Authorization: Bearer <TOKEN>
```

### Creating an Access Token

1. Navigate to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Click your profile picture → **Settings**
3. Select **Tokens** from the sidebar
4. Enter a descriptive name for the token
5. Choose the scope (Team or Personal)
6. Select an expiration date (1 day to 1 year)
7. Click **Create Token**
8. **Important:** Store the token securely - it will not be shown again

### Access Token Security

- **Expiration:** Setting an expiration date is highly recommended (1 day - 1 year)
- **Scope:** Tokens can be scoped to specific teams
- **Storage:** Tokens are encrypted at rest
- **Best Practice:** Use environment variables to store tokens, never commit to version control

### Accessing Team Resources

By default, tokens access personal account resources. To access team resources:

```bash
https://api.vercel.com/v6/deployments?teamId=[TEAM_ID]
```

Find your Team ID:
- Dashboard → Team Settings → General → Team ID

### Failed Authentication

- **Status Code:** `403 Forbidden`
- **Error Response:**
```json
{
  "error": {
    "code": "forbidden",
    "message": "Authentication failed"
  }
}
```

---

## Deployments

### Create a Deployment

**Endpoint:** `POST /v13/deployments`

Creates a new deployment for a project.

**Request Example:**

```bash
curl --request POST \
  --url "https://api.vercel.com/v13/deployments" \
  --header "Authorization: Bearer $VERCEL_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "name": "my-project",
    "files": [
      {
        "file": "index.html",
        "data": "PGh0bWw+SGVsbG8gV29ybGQ8L2h0bWw+"
      }
    ],
    "projectSettings": {
      "framework": "nextjs"
    }
  }'
```

**Query Parameters:**
- `teamId` (string): Team identifier to deploy on behalf of
- `slug` (string): Team slug to deploy on behalf of

**Request Body:**
- `name` (string, required): Project name
- `files` (array, required): Files to deploy
- `gitSource` (object): Git repository information
- `projectSettings` (object): Project configuration
- `target` (string): Deployment target (`production`, `preview`)

**Response (200):**
```json
{
  "id": "dpl_5WJWYSyB7BpgTj3EuwF37WMRBXBtPQ2iTMJHJBJyRfd",
  "url": "my-project-abc123.vercel.app",
  "name": "my-project",
  "meta": {},
  "readyState": "READY",
  "createdAt": 1540095775941,
  "buildingAt": 1540095777456,
  "ready": 1540095805321
}
```

### Get Deployment Events

**Endpoint:** `GET /v3/deployments/{idOrUrl}/events`

Retrieves build logs and events for a deployment.

**Path Parameters:**
- `idOrUrl` (string, required): Deployment ID or hostname

**Query Parameters:**
- `direction` (enum): `forward` or `backward` (default: `forward`)
- `follow` (enum): `0` or `1` - Enable live event streaming
- `limit` (number): Maximum number of events (-1 for all)
- `name` (string): Deployment build ID
- `since` (number): Timestamp to pull events from
- `until` (number): Timestamp to pull events until
- `statusCode` (number|string): HTTP status code filter (e.g., "5xx")
- `delimiter` (enum): `0` or `1`
- `builds` (enum): `0` or `1`
- `teamId` (string): Team identifier
- `slug` (string): Team slug

**Request Example:**

```typescript
import { Vercel } from "@vercel/sdk";

const vercel = new Vercel({
  bearerToken: process.env.VERCEL_TOKEN,
});

const result = await vercel.deployments.getDeploymentEvents({
  idOrUrl: "dpl_5WJWYSyB7BpgTj3EuwF37WMRBXBtPQ2iTMJHJBJyRfd",
  direction: "backward",
  limit: 100,
  statusCode: "5xx"
});
```

**Response (200):**
```json
[
  {
    "type": "delimiter",
    "created": 123,
    "payload": {
      "deploymentId": "dpl_xxx",
      "info": {
        "type": "build",
        "name": "Building",
        "entrypoint": "index.js"
      },
      "text": "Build completed successfully",
      "statusCode": 200
    }
  }
]
```

### List Deployments

**Endpoint:** `GET /v6/deployments`

**Query Parameters:**
- `app` (string): Filter by application name
- `from` (number): Timestamp to list from
- `limit` (number): Number of deployments (default: 20, max: 100)
- `projectId` (string): Filter by project ID
- `state` (string): Filter by state (`BUILDING`, `ERROR`, `INITIALIZING`, `QUEUED`, `READY`, `CANCELED`)
- `target` (string): Filter by target (`production`, `preview`)
- `teamId` (string): Team identifier

### Delete a Deployment

**Endpoint:** `DELETE /v13/deployments/{id}`

**Path Parameters:**
- `id` (string, required): Deployment ID

**Query Parameters:**
- `teamId` (string): Team identifier
- `slug` (string): Team slug

---

## Projects

### Create a Project

**Endpoint:** `POST /v11/projects`

**Request Body:**
- `name` (string, required): Project name
- `framework` (string): Framework preset (e.g., "nextjs", "react", "vue")
- `gitRepository` (object): Git repository configuration
  - `repo` (string): Repository URL
  - `type` (string): `github`, `gitlab`, or `bitbucket`
- `environmentVariables` (array): Environment variables
- `installCommand` (string): Custom install command
- `buildCommand` (string): Custom build command
- `devCommand` (string): Custom dev command
- `rootDirectory` (string): Root directory path

**cURL Example:**

```bash
curl --request POST \
  --url https://api.vercel.com/v11/projects \
  --header "Authorization: Bearer $VERCEL_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "environmentVariables": [
      {
        "key": "DATABASE_URL",
        "target": "production",
        "type": "encrypted",
        "value": "postgresql://..."
      }
    ],
    "framework": "nextjs",
    "gitRepository": {
      "repo": "https://github.com/user/repo",
      "type": "github"
    },
    "name": "my-nextjs-app",
    "rootDirectory": "/"
  }'
```

**TypeScript SDK Example:**

```typescript
import { Vercel } from '@vercel/sdk';

const vercel = new Vercel({
  bearerToken: process.env.VERCEL_TOKEN,
});

const result = await vercel.projects.createProject({
  requestBody: {
    name: 'my-nextjs-app',
    framework: 'nextjs',
    gitRepository: {
      repo: 'https://github.com/user/repo',
      type: 'github',
    },
    environmentVariables: [
      {
        key: 'DATABASE_URL',
        target: 'production',
        type: 'encrypted',
        value: 'postgresql://...',
      },
    ],
  },
});
```

### Get Project Details

**Endpoint:** `GET /v9/projects/{idOrName}`

**Path Parameters:**
- `idOrName` (string, required): Project ID or name

**Query Parameters:**
- `teamId` (string): Team identifier
- `slug` (string): Team slug

### Update a Project

**Endpoint:** `PATCH /v9/projects/{idOrName}`

**Request Body:** Same as Create Project (all fields optional)

### Delete a Project

**Endpoint:** `DELETE /v9/projects/{idOrName}`

**Path Parameters:**
- `idOrName` (string, required): Project ID or name

**Query Parameters:**
- `teamId` (string): Team identifier
- `slug` (string): Team slug

**Response (204):** No content - project successfully deleted

**Warning:** Deleting a project also deletes:
- All deployments
- All domains
- All environment variables
- All project settings

### Pause a Project

**Endpoint:** `POST /v1/projects/{projectId}/pause`

Pauses a project's production deployment. Users accessing the production deployment will see a 503 DEPLOYMENT_PAUSED error.

**Query Parameters:**
- `teamId` (string, required): Team identifier

**cURL Example:**

```bash
curl --request POST \
  --url "https://api.vercel.com/v1/projects/<project-id>/pause?teamId=<team-id>" \
  --header "Authorization: Bearer $VERCEL_TOKEN"
```

### Unpause a Project

**Endpoint:** `POST /v1/projects/{projectId}/unpause`

Resumes a paused project's production deployment.

**Query Parameters:**
- `teamId` (string, required): Team identifier

---

## Environment Variables

Environment variables are key-value pairs configured outside source code. They are encrypted at rest and can change based on the deployment environment.

### Environment Types

| Environment | Description |
|------------|-------------|
| **Production** | Applied to production deployments (main branch) |
| **Preview** | Applied to preview deployments (non-production branches) |
| **Development** | Used for local development with `vercel dev` |
| **Custom Environments** | User-defined custom environments |

### Size Limits

- **Total Size:** 64 KB per deployment (all variables combined)
- **Edge Functions/Middleware:** 5 KB per variable (edge runtime only)
- **Supported Runtimes:** Node.js, Python, Ruby, Go, PHP

### Create Environment Variable

**Endpoint:** `POST /v10/projects/{idOrName}/env`

**Path Parameters:**
- `idOrName` (string, required): Project ID or name

**Query Parameters:**
- `teamId` (string): Team identifier
- `upsert` (string): If "true", updates existing variable with same key

**Request Body:**
- `key` (string, required): Variable name
- `value` (string, required): Variable value
- `type` (enum, required): `plain`, `secret`, `encrypted`, `sensitive`, `system`
- `target` (array): Environments - `["production"]`, `["preview"]`, `["development"]`
- `gitBranch` (string): Specific git branch (preview only)
- `comment` (string): Description (max 500 chars)
- `customEnvironmentIds` (array): Custom environment IDs

**cURL Example:**

```bash
curl --request POST \
  --url "https://api.vercel.com/v10/projects/prj_abc123/env?teamId=team_xyz" \
  --header "Authorization: Bearer $VERCEL_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "key": "DATABASE_URL",
    "value": "postgresql://user:pass@host:5432/db",
    "type": "encrypted",
    "target": ["production", "preview"],
    "comment": "PostgreSQL database connection"
  }'
```

**TypeScript Example:**

```typescript
const result = await vercel.projects.createProjectEnv({
  idOrName: 'my-project',
  teamId: 'team_xyz',
  requestBody: {
    key: 'API_KEY',
    value: 'sk_live_...',
    type: 'sensitive',
    target: ['production'],
    comment: 'Stripe API Key'
  }
});
```

### List Environment Variables

**Endpoint:** `GET /v9/projects/{idOrName}/env`

**Query Parameters:**
- `teamId` (string): Team identifier
- `slug` (string): Team slug
- `decrypt` (boolean): If true, decrypt encrypted values
- `id` (string): Filter by specific env var ID
- `gitBranch` (string): Filter by git branch
- `source` (string): Filter by source

**Response (200):**
```json
{
  "envs": [
    {
      "id": "env_abc123",
      "key": "DATABASE_URL",
      "value": "***encrypted***",
      "type": "encrypted",
      "target": ["production"],
      "gitBranch": null,
      "createdAt": 1540095775941,
      "updatedAt": 1540095775941,
      "comment": "PostgreSQL connection string"
    }
  ]
}
```

### Edit Environment Variable

**Endpoint:** `PATCH /v9/projects/{idOrName}/env/{id}`

**Path Parameters:**
- `idOrName` (string, required): Project ID or name
- `id` (string, required): Environment variable ID

**Request Body:** Same fields as Create (all optional)

**Example:**

```typescript
await vercel.projects.editProjectEnv({
  idOrName: 'my-project',
  id: 'env_abc123',
  requestBody: {
    value: 'new-value',
    comment: 'Updated production database URL'
  }
});
```

### Delete Environment Variable

**Endpoint:** `DELETE /v9/projects/{idOrName}/env/{id}`

**Path Parameters:**
- `idOrName` (string, required): Project ID or name
- `id` (string, required): Environment variable ID

**Query Parameters:**
- `teamId` (string): Team identifier
- `slug` (string): Team slug

**Response (204):** Successfully deleted

### Preview Environment Variables

Preview environment variables apply to non-production branches. You can:
- Apply to all preview branches
- Apply to specific branches only
- Branch-specific variables override general preview variables

**Example - Branch-Specific Variable:**

```json
{
  "key": "API_ENDPOINT",
  "value": "https://staging.api.example.com",
  "type": "plain",
  "target": ["preview"],
  "gitBranch": "staging"
}
```

### Development Environment Variables

For local development, use `vercel env pull` to download variables:

```bash
vercel env pull
# Creates .env file with development variables
```

The `.env.local` file format:

```env
DATABASE_URL=postgresql://localhost:5432/dev
API_KEY=dev_key_123
NODE_ENV=development
```

### Integration Environment Variables

Integrations (e.g., MongoDB, Supabase) can automatically add environment variables to projects. These are marked with the integration name in the dashboard.

---

## Rate Limits

### Rate Limit Headers

All responses include rate limit information:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests permitted |
| `X-RateLimit-Remaining` | Requests remaining in current window |
| `X-RateLimit-Reset` | UTC epoch seconds when window resets |

### Rate Limit Error

**Status Code:** `429 Too Many Requests`

**Response:**
```json
{
  "error": {
    "code": "too_many_requests",
    "message": "Rate limit exceeded"
  }
}
```

### Common Rate Limits

Refer to the [Vercel Limits Documentation](https://vercel.com/docs/limits#rate-limits) for specific limits by plan tier.

**General Guidelines:**
- Free tier: Lower limits
- Pro tier: Higher limits
- Enterprise: Custom limits

---

## Error Codes

### HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| `200` | OK | Request successful |
| `204` | No Content | Successful deletion/update |
| `400` | Bad Request | Invalid request body or parameters |
| `401` | Unauthorized | Missing or invalid auth token |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Resource already exists or state conflict |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server error |

### Error Response Format

```json
{
  "error": {
    "code": "error_code",
    "message": "Human-readable error message"
  }
}
```

### Common Error Codes

- `forbidden` - Authentication failed or insufficient permissions
- `not_found` - Resource not found
- `bad_request` - Invalid request parameters
- `conflict` - Resource already exists
- `too_many_requests` - Rate limit exceeded
- `internal_server_error` - Server error

---

## Pagination

### Pagination Object

When responses contain arrays larger than the limit, a pagination object is returned:

```json
{
  "pagination": {
    "count": 20,
    "next": 1555072968396,
    "prev": 1555413045188
  }
}
```

**Fields:**
- `count` (number): Items in current page
- `next` (number|null): Timestamp for next page
- `prev` (number|null): Timestamp for previous page

### Pagination Parameters

- **Default Limit:** 20 items
- **Maximum Limit:** 100 items
- **Custom Limit:** `?limit=50`

### Fetching Paginated Results

**Node.js Example:**

```javascript
const axios = require('axios');

const vercelToken = process.env.VERCEL_TOKEN;
const apiEndpoint = 'https://api.vercel.com/v9/projects';

let config = {
  method: 'get',
  url: apiEndpoint,
  headers: {
    Authorization: 'Bearer ' + vercelToken,
  },
};
let results = [];

(function loop() {
  axios(config)
    .then(function (response) {
      results.push(...response.data.projects);
      if (response.data.pagination.next !== null) {
        config.url = `${apiEndpoint}?until=${response.data.pagination.next}`;
        loop();
      } else {
        console.log('All projects fetched:', results.length);
      }
    })
    .catch(function (error) {
      console.error(error);
    });
})();
```

---

## Data Types

| Type | Definition | Example |
|------|------------|---------|
| **ID** | Unique identifier | `"V0fra8eEgQwEpFhYG2vTzC3K"` |
| **String** | Text sequence | `"value"` |
| **Integer** | Number without decimals | `1234` |
| **Float** | Number with decimals | `12.34` |
| **Map** | Key-value pairs | `{ "key": "value" }` |
| **List** | Array of values | `["value", 1234, 12.34]` |
| **Enum** | Limited string values | `"production"` or `"preview"` |
| **Date** | Milliseconds since epoch | `1540095775941` |
| **IsoDate** | ISO 8601 format | `"2024-01-15T10:30:00Z"` |
| **Boolean** | True or false | `true` |

---

## Versioning

### Endpoint Versioning

- Versions are endpoint-specific (not global)
- Versions appear in the URL: `/v9/projects`
- Response shapes may add new keys without version bumps
- Old versions supported for extended periods
- Deprecation notices provided in changelog

**Example:**
```
https://api.vercel.com/v6/deployments
```

This uses version 6 of the deployments endpoint.

### Best Practices

- Only read required keys from responses
- Don't proxy entire responses to third parties
- Check changelog for deprecation notices
- Validate responses before using data

---

## Next.js Specific Features

### Next.js Framework Detection

Vercel automatically detects Next.js projects and applies optimizations:

- **Automatic Configuration:** Build settings auto-configured
- **Edge Functions:** Middleware support
- **ISR:** Incremental Static Regeneration
- **Image Optimization:** Automatic image optimization
- **Analytics:** Web Vitals tracking

### Next.js Project Settings

```json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "installCommand": "npm install",
  "devCommand": "next dev",
  "outputDirectory": ".next"
}
```

### Next.js Environment Variables

Next.js supports special environment variable prefixes:

- `NEXT_PUBLIC_*` - Exposed to browser
- Regular variables - Server-side only

**Example:**

```json
{
  "key": "NEXT_PUBLIC_API_URL",
  "value": "https://api.example.com",
  "type": "plain",
  "target": ["production", "preview"]
}
```

### Next.js Deployment Configuration

**vercel.json Example:**

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "regions": ["iad1", "sfo1"],
  "env": {
    "DATABASE_URL": "@database-url"
  },
  "build": {
    "env": {
      "NEXT_PUBLIC_ANALYTICS_ID": "@analytics-id"
    }
  }
}
```

---

## CI/CD Best Practices

### Continuous Integration

#### 1. GitHub Actions Integration

```yaml
name: Vercel Production Deployment
env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
on:
  push:
    branches:
      - main
jobs:
  Deploy-Production:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install Vercel CLI
        run: npm install --global vercel@latest
      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
      - name: Build Project
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
      - name: Deploy to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

#### 2. Automated Testing Before Deployment

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm test
      - run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - # Deploy steps...
```

### Deployment Strategies

#### 1. Preview Deployments

- Automatic preview for every PR
- Unique URL per deployment
- Test before merging

#### 2. Production Deployments

- Deploy from main/master branch
- Automatic rollback on errors
- Health checks before traffic routing

#### 3. Canary Deployments

Use deployment protection:

```json
{
  "deploymentProtection": {
    "enabled": true,
    "passwordProtection": false
  }
}
```

### Environment Management

#### 1. Separate Environments

```bash
# Production
vercel --prod

# Preview
vercel

# Development
vercel dev
```

#### 2. Environment-Specific Variables

```javascript
// Set via API
await vercel.projects.createProjectEnv({
  idOrName: 'my-project',
  requestBody: {
    key: 'API_URL',
    value: 'https://api.production.com',
    target: ['production']
  }
});

await vercel.projects.createProjectEnv({
  idOrName: 'my-project',
  requestBody: {
    key: 'API_URL',
    value: 'https://api.staging.com',
    target: ['preview']
  }
});
```

### Monitoring and Rollback

#### 1. Monitor Deployments

```bash
# List recent deployments
curl --request GET \
  --url "https://api.vercel.com/v6/deployments?projectId=prj_xxx&limit=10" \
  --header "Authorization: Bearer $VERCEL_TOKEN"
```

#### 2. Rollback Strategy

```bash
# Promote previous deployment
vercel promote <deployment-url> --prod
```

#### 3. Health Checks

Monitor deployment health via events endpoint:

```typescript
const events = await vercel.deployments.getDeploymentEvents({
  idOrUrl: deploymentId,
  statusCode: '5xx'
});

if (events.length > 0) {
  console.error('Deployment has errors');
  // Trigger rollback
}
```

### Security Best Practices

#### 1. Token Management

```bash
# Store tokens as GitHub secrets
# Never commit tokens to repository
# Use different tokens for different environments
```

#### 2. Environment Variable Security

- Use `encrypted` or `sensitive` types for secrets
- Rotate tokens regularly
- Limit token scope to specific teams
- Set expiration dates on tokens

#### 3. Deployment Protection

```json
{
  "deploymentProtection": {
    "enabled": true,
    "protectedPaths": ["/admin", "/api/internal"]
  }
}
```

### Performance Optimization

#### 1. Build Caching

Vercel automatically caches:
- `node_modules`
- `.next/cache`
- Build outputs

#### 2. Incremental Deployments

Only changed files are deployed:

```bash
vercel deploy --force  # Force full rebuild if needed
```

#### 3. Edge Caching

Configure cache headers:

```javascript
export const config = {
  runtime: 'edge',
};

export default function handler(req) {
  return new Response('Hello', {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
```

### Automation Scripts

#### Complete Deployment Script

```bash
#!/bin/bash
set -e

# Configuration
PROJECT_ID="prj_xxx"
TEAM_ID="team_yyy"
VERCEL_TOKEN="${VERCEL_TOKEN}"

# Function to deploy
deploy() {
  echo "Starting deployment..."

  # Pull environment
  vercel pull --yes --environment=production --token="$VERCEL_TOKEN"

  # Build
  vercel build --prod --token="$VERCEL_TOKEN"

  # Deploy
  DEPLOYMENT_URL=$(vercel deploy --prebuilt --prod --token="$VERCEL_TOKEN")

  echo "Deployed to: $DEPLOYMENT_URL"

  # Health check
  sleep 10
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL")

  if [ "$STATUS" -eq 200 ]; then
    echo "Deployment successful!"
  else
    echo "Deployment failed with status: $STATUS"
    exit 1
  fi
}

# Run deployment
deploy
```

---

## Additional Resources

### Official Documentation

- [Vercel API Reference](https://vercel.com/docs/rest-api)
- [Vercel SDK Documentation](https://vercel.com/docs/rest-api/reference/sdk)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Rate Limits](https://vercel.com/docs/limits#rate-limits)

### Tools and SDKs

- **TypeScript/JavaScript:** `@vercel/sdk`
- **CLI:** `npm install -g vercel`
- **Postman Collection:** Available via Vercel dashboard

### Support

- [GitHub Discussions](https://github.com/vercel/vercel/discussions)
- [Discord Community](https://vercel.com/discord)
- [Support Portal](https://vercel.com/support)

---

## Quick Reference

### Common Endpoints

```bash
# Authentication
Authorization: Bearer $VERCEL_TOKEN

# Deployments
GET    /v6/deployments
POST   /v13/deployments
GET    /v3/deployments/{id}/events
DELETE /v13/deployments/{id}

# Projects
GET    /v9/projects
POST   /v11/projects
GET    /v9/projects/{idOrName}
PATCH  /v9/projects/{idOrName}
DELETE /v9/projects/{idOrName}

# Environment Variables
GET    /v9/projects/{idOrName}/env
POST   /v10/projects/{idOrName}/env
PATCH  /v9/projects/{idOrName}/env/{id}
DELETE /v9/projects/{idOrName}/env/{id}

# Project Management
POST   /v1/projects/{id}/pause
POST   /v1/projects/{id}/unpause
```

### Environment Variable Types

- `plain` - Plaintext
- `secret` - Legacy secret (use `sensitive` instead)
- `encrypted` - Encrypted at rest
- `sensitive` - Encrypted, masked in UI
- `system` - System-generated

### Deployment States

- `BUILDING` - Currently building
- `ERROR` - Build failed
- `INITIALIZING` - Initializing deployment
- `QUEUED` - Waiting to build
- `READY` - Successfully deployed
- `CANCELED` - Deployment canceled

---

**End of Documentation**

*For the latest updates, always refer to the [official Vercel API documentation](https://vercel.com/docs/rest-api).*
