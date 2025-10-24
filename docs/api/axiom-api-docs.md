# Axiom API Documentation

**Complete Reference Guide for REST API, Ingest, Query, and APL**

Last Updated: October 23, 2025

---

## Table of Contents

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Data Ingestion](#data-ingestion)
5. [Query API](#query-api)
6. [APL Query Language](#apl-query-language)
7. [Rate Limits](#rate-limits)
8. [Error Codes](#error-codes)
9. [Best Practices](#best-practices)
10. [Code Examples](#code-examples)

---

## API Overview

### Base URLs

Axiom API uses different base domains depending on your organization's region:

- **US Region**: `https://api.axiom.co`
- **EU Region**: `https://api.eu.axiom.co`

All API requests must be made over HTTPS. The API follows REST architectural principles and uses JSON for serialization.

### Prerequisites

Before using the Axiom API:

1. Create an Axiom account at https://app.axiom.co/register
2. Create a dataset where you will send your data
3. Generate an API token with appropriate permissions

### Content Type

All API requests must include the `Content-Type` header set to `application/json` unless otherwise specified. Axiom encodes all responses (including errors) as JSON objects.

### Data Types

| Type        | Definition                               | Example                  |
| ----------- | ---------------------------------------- | ------------------------ |
| **ID**      | Unique value for resource identification | "io12h34io1h24i"         |
| **String**  | Text sequence                            | "string value"           |
| **Boolean** | True/false value                         | true                     |
| **Integer** | Number without decimals                  | 4567                     |
| **Float**   | Number with decimals                     | 15.67                    |
| **Map**     | Key-value data structure                 | `{ "key": "value" }`     |
| **List**    | Comma-separated values                   | `["value", 4567, 45.67]` |

---

## Authentication

Axiom offers two types of authentication tokens:

### API Tokens (Recommended)

API tokens allow fine-grained control over actions:

- **Basic API Tokens**: For data ingestion only
- **Advanced API Tokens**: For wide range of actions (query, dataset management, etc.)

**Creating a Basic API Token:**

1. Navigate to Settings > API tokens
2. Click "New API token"
3. Name your token
4. Select "Basic" permissions
5. Choose datasets for ingest access
6. Copy and store the token securely (displayed only once)

**Creating an Advanced API Token:**

1. Navigate to Settings > API tokens
2. Click "New API token"
3. Name your token
4. Select "Advanced" permissions
5. Configure dataset access and specific actions
6. Set org-level permissions if needed
7. Copy and store the token securely

**Usage:**

```bash
Authorization: Bearer API_TOKEN
```

### Personal Access Tokens (PAT)

PATs provide full account control. Use API tokens instead when possible.

**Creating a PAT:**

1. Navigate to Settings > Profile
2. In "Personal tokens" section, click "New token"
3. Name the PAT
4. Copy and store securely

**Usage:**

```bash
Authorization: Bearer PAT_TOKEN
x-axiom-org-id: ORG_ID
```

**Finding Organization ID:**

- Settings page (top right corner)
- Settings > General (ID section)
- URL pattern: `https://app.axiom.co/axiom-abcd/datasets` → ORG_ID is `axiom-abcd`

### Token Security

- Keep tokens confidential
- Never share in client-side code or public repositories
- Follow principle of least privilege
- Set expiration dates when possible
- Regenerate tokens regularly
- Store in environment variables

---

## API Endpoints

### Base Endpoint Format

```
{BASE_URL}/v1/{resource}/{action}
```

### Common Endpoints

#### Ingest Data

```
POST https://api.axiom.co/v1/datasets/{DATASET_NAME}/ingest
```

#### Query Data

```
POST https://api.axiom.co/v1/datasets/{DATASET_NAME}/query
```

#### Dataset Management

- List datasets: `GET /v1/datasets`
- Get dataset: `GET /v1/datasets/{name}`
- Create dataset: `POST /v1/datasets`
- Update dataset: `PUT /v1/datasets/{name}`
- Delete dataset: `DELETE /v1/datasets/{name}`

---

## Data Ingestion

Axiom accepts data in multiple formats: JSON, NDJSON, and CSV.

### JSON Format

**Structure:**

Array of JSON objects representing events.

**Example Request:**

```bash
curl -X 'POST' 'https://api.axiom.co/v1/datasets/my-dataset/ingest' \
  -H 'Authorization: Bearer API_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '[
    {
      "time": "2025-01-12T00:00:00.000Z",
      "data": {"key1": "value1", "key2": "value2"}
    },
    {
      "data": {"key3": "value3"},
      "labels": {"key4": "value4"}
    }
  ]'
```

**Response:**

```json
{
  "ingested": 2,
  "failed": 0,
  "failures": [],
  "processedBytes": 219,
  "blocksCreated": 0,
  "walLength": 2
}
```

### NDJSON Format

**Structure:**

Each JSON object on a separate line (newline-delimited JSON).

**Example Request:**

```bash
curl -X 'POST' 'https://api.axiom.co/v1/datasets/my-dataset/ingest' \
  -H 'Authorization: Bearer API_TOKEN' \
  -H 'Content-Type: application/x-ndjson' \
  -d '{"id":1,"name":"machala"}
{"id":2,"name":"axiom"}
{"id":3,"name":"apl"}
{"timestamp": "2016-06-06T12:00:00+02:00", "attributes": {"key1": "value1"}}
{"queryString": "count()"}'
```

**Response:**

```json
{
  "ingested": 5,
  "failed": 0,
  "failures": [],
  "processedBytes": 266,
  "blocksCreated": 0,
  "walLength": 5
}
```

### CSV Format

**Structure:**

First line contains field names, subsequent lines contain values.

**Example Request:**

```bash
curl -X 'POST' 'https://api.axiom.co/v1/datasets/my-dataset/ingest' \
  -H 'Authorization: Bearer API_TOKEN' \
  -H 'Content-Type: text/csv' \
  -d 'user, name
foo, bar'
```

**Response:**

```json
{
  "ingested": 1,
  "failed": 0,
  "failures": [],
  "processedBytes": 28,
  "blocksCreated": 0,
  "walLength": 1
}
```

### Ingest with Node.js

```javascript
const axiom = require('@axiomhq/js');

axiom.ingest('DATASET_NAME', [{ foo: 'bar' }]);
await axiom.flush();
```

### Nested Data Structures

Axiom supports complex nested arrays and objects:

```json
{
  "axiom": {
    "logging": {
      "observability": [
        { "apl": 23, "function": "tostring" },
        { "apl": 24, "operator": "summarize" }
      ]
    },
    "apl": {
      "reference": [
        [80, 12],
        [30, 40]
      ]
    }
  }
}
```

### Batch Ingestion

For optimal performance:

- Use batching clients to aggregate data
- Send arrays of events in single requests
- Recommended batch size: 100-1000 events
- Maximum payload size: Check current limits

---

## Query API

### APL Query Endpoint

```
POST https://api.axiom.co/v1/datasets/{DATASET_NAME}/query
```

**Request Headers:**

```
Authorization: Bearer API_TOKEN
Content-Type: application/json
```

**Request Body:**

```json
{
  "apl": "['dataset-name'] | where status == 'error' | summarize count() by bin_auto(_time)",
  "startTime": "2025-01-01T00:00:00Z",
  "endTime": "2025-01-31T23:59:59Z"
}
```

**Response Headers:**

- `X-QueryLimit-Limit`: Query cost limit in GB\*ms
- `X-QueryLimit-Remaining`: Remaining query GB\*ms
- `X-QueryLimit-Reset`: UTC epoch seconds for reset

---

## APL Query Language

### APL Overview

Axiom Processing Language (APL) is a query language for filtering, manipulating, and summarizing data.

### Query Structure

```
DatasetName
| Operator ...
| Operator ...
```

Operators are delimited by pipe character (`|`).

### Basic Example

```apl
['github-issue-comment-event']
| extend isBot = actor contains '-bot' or actor contains '[bot]'
| where isBot == true
| summarize count() by bin_auto(_time), actor
```

**Explanation:**

1. **Data source**: `github-issue-comment-event` dataset
2. **extend**: Creates new field `isBot`
3. **where**: Filters rows where `isBot == true`
4. **summarize**: Aggregates data and produces chart

### Quoting Field Names

Use quotes for field names containing special characters:

- Space (` `)
- Dot (`.`)
- Dash (`-`)

**Format:**

```apl
['my-field']
['my.field']
['my field']
```

### Common Operators

#### where - Filter Data

```apl
['logs'] | where status == 'error'
['logs'] | where duration > 500ms
['logs'] | where _time > ago(2h)
```

#### extend - Add Computed Fields

```apl
['logs'] | extend duration_s = duration/1000
['logs'] | extend success = status < 400
```

#### summarize - Aggregate Data

```apl
// Count by field
['logs'] | summarize count() by status

// Multiple aggregations
['logs'] | summarize
  count(),
  avg(duration),
  max(duration),
  p95=percentile(duration, 95)
  by endpoint

// Time-based aggregation
['logs'] | summarize count() by bin(_time, 5m), status
```

#### project - Select Fields

```apl
['logs'] | project _time, status, message
['logs'] | project-rename responseTime=duration, path=url
```

#### parse - Extract Data

```apl
// Parse key-value pairs
['logs'] | parse-kv message as (duration:long, error:string)
  with (pair_delimiter=",")

// Regex extraction
['logs'] | extend errorCode = extract("error code ([0-9]+)", 1, message)
```

#### search - Full-text Search

```apl
search "error" or "exception"
['logs'] | where message contains_cs "ERROR"
['logs'] | where message startswith "FATAL"
```

#### join - Combine Datasets

```apl
['errors']
| join kind=inner (['users'] | project userId, email) on userId
```

#### make-series - Time Series

```apl
['metrics']
| make-series avg(cpu) default=0 on _time step 1m by host
```

### Aggregation Functions

```apl
count()                          // Count rows
sum(field)                      // Sum values
avg(field)                      // Average
min(field), max(field)          // Min/max
percentile(field, 95)           // Percentile
dcount(field)                   // Distinct count
histogram(field, 100)           // Histogram
dimensional_analysis(field, pack_array(...))  // Dimensional analysis
```

### Scalar Functions

```apl
// String operations
tolower(field)
toupper(field)
strcat(str1, ": ", str2)
replace_regex(field, pattern, replacement)

// Time operations
ago(2h)
now()
datetime(2024-01-01)
bin(time, 1h)

// Conditional
case(condition1, value1, condition2, value2, default)
```

### Advanced Patterns

#### Error Analysis

```apl
['logs']
| where severity == "error"
| summarize error_count=count() by error_code, service
```

#### Latency Tracking

```apl
['logs']
| summarize
  p50=percentile(duration, 50),
  p90=percentile(duration, 90)
  by endpoint
```

#### User Activity

```apl
['logs']
| summarize user_actions=count() by userId, action, bin(_time, 1h)
```

---

## Rate Limits

Axiom implements rate limiting to ensure fair usage and maintain service quality.

### Rate Limit Headers

**All API responses include:**

| Header                  | Description                     |
| ----------------------- | ------------------------------- |
| `X-RateLimit-Scope`     | Scope: "user" or "organization" |
| `X-RateLimit-Limit`     | Max requests per minute         |
| `X-RateLimit-Remaining` | Remaining requests in window    |
| `X-RateLimit-Reset`     | UTC epoch seconds for reset     |

### Rate Limit Types

#### 1. Request Rate Limits

Per-minute request limits based on authentication level.

**When Exceeded:**

```
HTTP 429 Too Many Requests

{
  "message": "rate limit exceeded"
}
```

#### 2. Query Limits

| Header                   | Description                 |
| ------------------------ | --------------------------- |
| `X-QueryLimit-Limit`     | Query cost limit (GB\*ms)   |
| `X-QueryLimit-Remaining` | Remaining query GB\*ms      |
| `X-QueryLimit-Reset`     | UTC epoch seconds for reset |

#### 3. Ingest Limits

| Header                    | Description                 |
| ------------------------- | --------------------------- |
| `X-IngestLimit-Limit`     | Max bytes per month         |
| `X-IngestLimit-Remaining` | Remaining bytes in window   |
| `X-IngestLimit-Reset`     | UTC epoch seconds for reset |

### Best Practices for Rate Limits

1. **Use Batching**: Aggregate multiple events into single requests
2. **Monitor Headers**: Track remaining quota in responses
3. **Implement Backoff**: Use exponential backoff for retries
4. **Cache Results**: Store frequently accessed data locally
5. **Optimize Queries**: Reduce token usage and query complexity

### Handling Rate Limit Errors

```javascript
async function makeApiRequest(data) {
  try {
    const response = await fetch('https://api.axiom.co/v1/datasets/my-dataset/ingest', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (response.status === 429) {
      const resetTime = response.headers.get('X-RateLimit-Reset');
      const waitTime = resetTime * 1000 - Date.now();

      console.log(`Rate limited. Waiting ${waitTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      // Retry request
      return makeApiRequest(data);
    }

    return response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}
```

---

## Error Codes

### HTTP Status Codes

| Code | Status                | Description                           |
| ---- | --------------------- | ------------------------------------- |
| 200  | OK                    | Request succeeded                     |
| 201  | Created               | Resource created successfully         |
| 400  | Bad Request           | Invalid request parameters            |
| 401  | Unauthorized          | Authentication failed or not provided |
| 403  | Forbidden             | Authenticated but access denied       |
| 404  | Not Found             | Resource not found                    |
| 422  | Unprocessable Entity  | Validation error                      |
| 429  | Too Many Requests     | Rate limit exceeded                   |
| 500  | Internal Server Error | Server-side error occurred            |
| 503  | Service Unavailable   | Temporary service disruption          |

### Common Error Responses

#### Authentication Error (403)

```json
{
  "error": "Forbidden",
  "message": "Invalid or missing API token"
}
```

#### Rate Limit Error (429)

```json
{
  "message": "rate limit exceeded"
}
```

#### Validation Error (400)

```json
{
  "error": "Bad Request",
  "message": "Invalid dataset name format",
  "details": {
    "field": "dataset_name",
    "constraint": "alphanumeric-dash-only"
  }
}
```

### Error Handling Example

```javascript
async function ingestData(dataset, events) {
  try {
    const response = await axios.post(
      `https://api.axiom.co/v1/datasets/${dataset}/ingest`,
      events,
      {
        headers: {
          Authorization: `Bearer ${process.env.AXIOM_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    if (error.response) {
      switch (error.response.status) {
        case 400:
          console.error('Invalid request:', error.response.data);
          break;
        case 401:
        case 403:
          console.error('Authentication failed. Check API token.');
          break;
        case 429:
          console.error('Rate limited. Implement backoff strategy.');
          // Implement retry with exponential backoff
          break;
        case 500:
        case 503:
          console.error('Server error. Retry later.');
          break;
        default:
          console.error('Unexpected error:', error.response.status);
      }
    }
    throw error;
  }
}
```

---

## Best Practices

### 1. Data Ingestion Best Practices

**Use Batch Ingestion:**

```javascript
// Good: Batch multiple events
const events = [
  { timestamp: new Date(), level: 'info', message: 'Event 1' },
  { timestamp: new Date(), level: 'info', message: 'Event 2' },
  { timestamp: new Date(), level: 'info', message: 'Event 3' },
];
await axiom.ingest('dataset', events);

// Avoid: Individual requests per event
for (const event of events) {
  await axiom.ingest('dataset', [event]); // Too many requests!
}
```

**Optimize Payload Size:**

- Remove unnecessary fields
- Use appropriate data types
- Compress large payloads
- Monitor `processedBytes` in responses

**Handle Timestamp Fields:**

```javascript
// Specify timestamp field and format
const events = [{
  custom_time: '2025-01-15T10:30:45Z',
  data: { ... }
}];

// Include timestamp configuration
const config = {
  'timestamp-field': 'custom_time',
  'timestamp-format': 'rfc3339'
};
```

### 2. Query Optimization

**Use Time Filters:**

```apl
// Always specify time range
['logs']
| where _time > ago(2h) and _time < now()
| where status == 'error'
```

**Select Only Needed Fields:**

```apl
// Good: Project specific fields
['logs'] | project _time, status, message

// Avoid: Selecting all fields
['logs'] | where status == 'error'
```

**Optimize Aggregations:**

```apl
// Prefer specific time bins
['logs'] | summarize count() by bin(_time, 5m)

// Avoid: Automatic bins for large time ranges
['logs'] | summarize count() by bin_auto(_time)  // Can be expensive
```

### 3. Security Best Practices

**Store Tokens Securely:**

```javascript
// Good: Environment variables
const API_TOKEN = process.env.AXIOM_API_TOKEN;

// Bad: Hardcoded tokens
const API_TOKEN = 'xaat-12345...'; // Never do this!
```

**Use Appropriate Token Types:**

- Use Basic API tokens for ingestion-only apps
- Use Advanced API tokens with minimal required permissions
- Avoid PATs unless absolutely necessary

**Rotate Tokens Regularly:**

1. Generate new token
2. Update application configuration
3. Test new token
4. Delete old token

### 4. Error Handling

**Implement Retry Logic:**

```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.response?.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

**Log Failures:**

```javascript
try {
  await axiom.ingest('dataset', events);
} catch (error) {
  console.error('Ingest failed:', {
    error: error.message,
    dataset: 'dataset',
    eventCount: events.length,
    timestamp: new Date().toISOString(),
  });
}
```

### 5. Monitoring and Alerting

**Track API Usage:**

```javascript
const usage = {
  requests: 0,
  bytesIngested: 0,
  errors: 0,
};

async function ingestWithTracking(dataset, events) {
  try {
    const result = await axiom.ingest(dataset, events);
    usage.requests++;
    usage.bytesIngested += result.processedBytes;
    return result;
  } catch (error) {
    usage.errors++;
    throw error;
  }
}
```

**Set Up Alerts:**

- Monitor rate limit headers
- Alert when credits are low
- Track error rates
- Monitor query performance

---

## Code Examples

### Complete Node.js Integration

```javascript
const axios = require('axios');

class AxiomClient {
  constructor(apiToken, dataset, region = 'us') {
    this.apiToken = apiToken;
    this.dataset = dataset;
    this.baseUrl = region === 'eu' ? 'https://api.eu.axiom.co' : 'https://api.axiom.co';
  }

  async ingest(events) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/datasets/${this.dataset}/ingest`,
        events,
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`Ingested ${response.data.ingested} events`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async query(apl, startTime, endTime) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/datasets/${this.dataset}/query`,
        { apl, startTime, endTime },
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      switch (status) {
        case 429:
          const resetTime = error.response.headers['x-ratelimit-reset'];
          console.error(`Rate limited. Reset at: ${new Date(resetTime * 1000)}`);
          break;
        case 401:
        case 403:
          console.error('Authentication failed:', data);
          break;
        default:
          console.error('API error:', status, data);
      }
    }
    throw error;
  }
}

// Usage
const client = new AxiomClient(process.env.AXIOM_API_TOKEN, 'my-dataset');

// Ingest data
await client.ingest([
  { level: 'info', message: 'Application started' },
  { level: 'error', message: 'Connection failed' },
]);

// Query data
const results = await client.query(
  "['my-dataset'] | where level == 'error' | summarize count()",
  '2025-01-01T00:00:00Z',
  '2025-01-31T23:59:59Z'
);
```

### Python Integration

```python
import requests
import os
from datetime import datetime, timedelta

class AxiomClient:
    def __init__(self, api_token, dataset, region='us'):
        self.api_token = api_token
        self.dataset = dataset
        self.base_url = (
            'https://api.eu.axiom.co' if region == 'eu'
            else 'https://api.axiom.co'
        )
        self.headers = {
            'Authorization': f'Bearer {api_token}',
            'Content-Type': 'application/json'
        }

    def ingest(self, events):
        url = f'{self.base_url}/v1/datasets/{self.dataset}/ingest'
        response = requests.post(url, json=events, headers=self.headers)

        if response.status_code == 429:
            reset_time = response.headers.get('X-RateLimit-Reset')
            print(f'Rate limited. Reset at: {reset_time}')
            raise Exception('Rate limit exceeded')

        response.raise_for_status()
        return response.json()

    def query(self, apl, start_time=None, end_time=None):
        if not start_time:
            start_time = (datetime.now() - timedelta(hours=24)).isoformat() + 'Z'
        if not end_time:
            end_time = datetime.now().isoformat() + 'Z'

        url = f'{self.base_url}/v1/datasets/{self.dataset}/query'
        payload = {
            'apl': apl,
            'startTime': start_time,
            'endTime': end_time
        }

        response = requests.post(url, json=payload, headers=self.headers)
        response.raise_for_status()
        return response.json()

# Usage
client = AxiomClient(
    os.environ['AXIOM_API_TOKEN'],
    'my-dataset'
)

# Ingest data
client.ingest([
    {'level': 'info', 'message': 'Application started'},
    {'level': 'error', 'message': 'Connection failed'}
])

# Query data
results = client.query("['my-dataset'] | where level == 'error' | count()")
print(f"Error count: {results}")
```

### cURL Examples

**Ingest JSON:**

```bash
curl -X POST 'https://api.axiom.co/v1/datasets/my-dataset/ingest' \
  -H "Authorization: Bearer ${AXIOM_API_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '[
    {
      "timestamp": "2025-01-15T10:30:45Z",
      "level": "info",
      "message": "User login successful",
      "user_id": "user123"
    }
  ]'
```

**Query with APL:**

```bash
curl -X POST 'https://api.axiom.co/v1/datasets/my-dataset/query' \
  -H "Authorization: Bearer ${AXIOM_API_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{
    "apl": "[\"my-dataset\"] | where level == \"error\" | summarize count() by bin_auto(_time)",
    "startTime": "2025-01-01T00:00:00Z",
    "endTime": "2025-01-31T23:59:59Z"
  }'
```

---

## Additional Resources

### Official Documentation

- Axiom Documentation: https://axiom.co/docs
- API Reference: https://axiom.co/docs/restapi/introduction
- APL Reference: https://axiom.co/docs/apl/introduction
- Rate Limits: https://axiom.co/docs/restapi/api-limits

### Support

- Community Discord: https://axiom.co/discord
- Support Email: support@axiom.co
- Status Page: https://status.axiom.co

### Libraries and SDKs

- Node.js: `@axiomhq/js`
- Python: `axiom-py`
- Go: `axiom-go`
- Rust: `axiom-rs`

---

## Logging Best Practices

### Structured Logging Format

```javascript
const log = {
  timestamp: new Date().toISOString(),
  level: 'info|warn|error|debug',
  service: 'service-name',
  environment: 'production|staging|development',
  message: 'Human-readable message',
  metadata: {
    user_id: 'user123',
    request_id: 'req-abc-123',
    duration_ms: 150,
  },
  error: {
    name: 'ErrorName',
    message: 'Error description',
    stack: 'Stack trace...',
  },
};
```

### Log Levels

- **debug**: Detailed diagnostic information
- **info**: General informational messages
- **warn**: Warning messages for potentially harmful situations
- **error**: Error events that might still allow the application to continue
- **fatal**: Severe errors that cause premature termination

### Field Naming Conventions

- Use lowercase with underscores: `user_id`, `request_duration`
- Be consistent across all logs
- Avoid special characters in field names
- Use semantic names that describe the data

---

## Conclusion

This documentation provides a comprehensive reference for working with the Axiom API. Key takeaways:

1. **Authentication**: Use API tokens with minimal required permissions
2. **Ingestion**: Batch events for optimal performance
3. **Queries**: Always specify time ranges and select only needed fields
4. **Rate Limits**: Monitor headers and implement backoff strategies
5. **Error Handling**: Implement robust retry logic and logging
6. **Security**: Store tokens securely and rotate regularly

For the most up-to-date information, always refer to the official Axiom documentation at https://axiom.co/docs/introduction
