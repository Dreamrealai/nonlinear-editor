# Logging Infrastructure

This project uses a dual logging strategy optimized for Next.js serverless environments:

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Client)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  browserLogger.ts                                     │  │
│  │  - Batches logs (10/batch or 5s interval)           │  │
│  │  - Captures errors, warnings, console logs           │  │
│  │  - Sends to /api/logs endpoint                       │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │ POST /api/logs
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 Next.js API Routes (Server)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  serverLogger.ts (Pino)                              │  │
│  │  - Ultra-thin Pino implementation                    │  │
│  │  - Pretty print in dev, JSON in prod                 │  │
│  │  - Batched Axiom transport                           │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS POST
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        Axiom.co                              │
│  Dataset: genai-video-production                            │
│  - Centralized log aggregation                              │
│  - Query with APL (Axiom Processing Language)               │
│  - Alerts, dashboards, analytics                            │
└─────────────────────────────────────────────────────────────┘
```

## Browser Logging

### Usage

```typescript
import { browserLogger } from '@/lib/browserLogger';

// Simple logging
browserLogger.info('User clicked button');
browserLogger.error('Failed to save');

// With context data
browserLogger.error({ error: err, userId: '123' }, 'Failed to save project');

// Child logger with persistent context
const pageLogger = browserLogger.child({ page: '/editor' });
pageLogger.info('Page loaded');
```

### Features

- ✅ Automatic error capture (uncaught errors, unhandled rejections)
- ✅ Console interception (`console.error`, `console.warn`)
- ✅ Batching for performance (10 logs or 5 seconds)
- ✅ Page unload handling with `sendBeacon`
- ✅ Error serialization with stack traces
- ✅ Development fallback to console

### Configuration

No configuration needed. Logs automatically sent to `/api/logs` which forwards to Axiom.

## Server Logging (Pino)

### Usage

```typescript
import { serverLogger } from '@/lib/serverLogger';

// Simple logging
serverLogger.info('Server started');
serverLogger.error('Database connection failed');

// With context data
serverLogger.info({ userId: '123', action: 'login' }, 'User logged in');

// Error logging with serialization
try {
  await riskyOperation();
} catch (error) {
  serverLogger.error({ error }, 'Operation failed');
}

// Child logger with route context
const routeLogger = serverLogger.child({ route: '/api/users' });
routeLogger.info('Route accessed');
```

### Features

- ✅ **Ultra-thin**: Minimal overhead, optimized for serverless
- ✅ **Pino**: Industry-standard, fastest JSON logger
- ✅ **Pretty Print**: Colored output in development
- ✅ **Axiom Integration**: Batched async transport
- ✅ **Auto-serialization**: Errors, HTTP req/res
- ✅ **Child Loggers**: Contextual logging

### Log Levels

- `trace` (10): Very detailed debug info
- `debug` (20): Debug information
- `info` (30): General information
- `warn` (40): Warning messages
- `error` (50): Error conditions
- `fatal` (60): Application crash

Default level: `debug` in development, `info` in production

## Axiom Configuration

### Environment Variables

```bash
# Required for both browser and server logging
AXIOM_TOKEN=xaat-...
AXIOM_DATASET=genai-video-production
```

### Querying Logs

Use Axiom Processing Language (APL) to query logs:

```apl
// All browser errors in last 24h
['genai-video-production']
| where _time > ago(24h)
| where source == "browser" and level == "error"
| project _time, message, url

// Server logs by route
['genai-video-production']
| where source == "server"
| summarize count() by route
| order by count_ desc
```

## Best Practices

### 1. Use Appropriate Log Levels

```typescript
// ❌ Bad
serverLogger.error('User clicked button'); // Too severe

// ✅ Good
serverLogger.info({ userId }, 'User clicked button');
serverLogger.error({ error, userId }, 'Failed to save user data');
```

### 2. Include Context

```typescript
// ❌ Bad
serverLogger.error('Save failed');

// ✅ Good
serverLogger.error(
  { error, userId, projectId, operation: 'save' },
  'Failed to save project'
);
```

### 3. Use Child Loggers for Routes

```typescript
// API Route: app/api/projects/route.ts
const logger = serverLogger.child({ route: '/api/projects' });

export async function POST(req: Request) {
  logger.info('Creating new project');
  // ...
  logger.error({ error }, 'Project creation failed');
}
```

### 4. Don't Log Sensitive Data

```typescript
// ❌ Bad
serverLogger.info({ password, apiKey }, 'User authenticated');

// ✅ Good
serverLogger.info({ userId }, 'User authenticated');
```

## Performance Characteristics

### Browser Logger
- **Batch size**: 10 logs
- **Batch interval**: 5 seconds
- **API overhead**: ~1 POST request per 10 logs
- **Memory**: Minimal (queue cleared on batch)

### Server Logger (Pino)
- **Throughput**: ~40,000 logs/second (Pino benchmark)
- **Batch size**: 10 logs to Axiom
- **Batch interval**: 2 seconds
- **Serverless optimized**: Auto-flush on process exit

## Troubleshooting

### Logs not appearing in Axiom

1. Check environment variables are set:
   ```bash
   echo $AXIOM_TOKEN
   echo $AXIOM_DATASET
   ```

2. Verify Axiom credentials:
   ```typescript
   // In browser console or API route
   console.log(process.env.AXIOM_TOKEN?.slice(0, 10)); // Should show "xaat-..."
   ```

3. Check Axiom dataset exists and is writable

### Development console logs only

If you only see logs in console but not in Axiom:
- Ensure `.env.local` contains Axiom credentials
- Restart Next.js dev server
- Check network tab for POST requests to `/api/logs`

### Pino not working in serverless

This is expected behavior. Pino logs are captured by Vercel's logging infrastructure and also sent to Axiom via our custom transport.

## Migration from Old Logger

Old logger usage:
```typescript
const logger = new ServerLogger();
logger.info(undefined, 'Server started');
logger.error({ error: err }, 'Failed');
```

New Pino usage:
```typescript
import { serverLogger } from '@/lib/serverLogger';
serverLogger.info('Server started');
serverLogger.error({ error: err }, 'Failed');
```

**Key differences:**
- No need to pass `undefined` for data parameter
- Data and message order can be swapped (Pino is flexible)
- Built-in error serialization
- Child loggers available via `.child()`
