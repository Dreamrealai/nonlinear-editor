# K6 Load Tests

This directory contains k6 load test scripts for the video editor API endpoints.

## Installation

Install k6 from: https://k6.io/docs/getting-started/installation/

```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

## Running Tests

### Basic execution

```bash
# Video generation test
k6 run k6/video-generation.test.js

# Audio generation test
k6 run k6/audio-generation.test.js

# Image generation test
k6 run k6/image-generation.test.js
```

### With custom parameters

```bash
# Specify number of virtual users and duration
k6 run --vus 10 --duration 60s k6/video-generation.test.js

# Use environment variables
k6 run --env BASE_URL=https://your-app.com --env TEST_EMAIL=user@example.com k6/video-generation.test.js
```

### Output formats

```bash
# JSON output
k6 run --out json=test-results.json k6/video-generation.test.js

# InfluxDB output (for Grafana dashboards)
k6 run --out influxdb=http://localhost:8086/k6 k6/video-generation.test.js

# Cloud output (k6 Cloud)
k6 run --out cloud k6/video-generation.test.js
```

## Test Files

### `video-generation.test.js`

Tests the video generation endpoints with:

- Rate limit handling
- Status polling
- Multiple concurrent users
- Response time tracking

**Endpoints tested:**

- `POST /api/video/generate`
- `GET /api/video/status`

**Metrics:**

- `rate_limit_hits` - Number of 429 responses
- `successful_generations` - Successful generation requests
- `failed_generations` - Failed generation requests
- `video_generate_response_time` - Response time trend
- `status_check_response_time` - Status polling time

### `audio-generation.test.js`

Tests audio generation APIs:

- ElevenLabs text-to-speech
- Suno music generation

**Endpoints tested:**

- `POST /api/audio/elevenlabs/generate`
- `POST /api/audio/suno/generate`
- `GET /api/audio/suno/status`

**Metrics:**

- `elevenlabs_success` / `elevenlabs_failed`
- `suno_success` / `suno_failed`
- Response time trends for both providers

### `image-generation.test.js`

Tests image generation with Google Imagen:

**Endpoints tested:**

- `POST /api/image/generate`

**Metrics:**

- `successful_generations` / `failed_generations`
- `rate_limit_hits`
- `generation_response_time`

## Environment Variables

All tests support these environment variables:

- `BASE_URL` - API base URL (default: `http://localhost:3000`)
- `TEST_EMAIL` - Test user email (default: `david@dreamreal.ai`)
- `TEST_PASSWORD` - Test user password (default: `sc3p4sses`)

Example:

```bash
BASE_URL=https://staging.example.com \
TEST_EMAIL=test@example.com \
TEST_PASSWORD=password123 \
k6 run k6/video-generation.test.js
```

## Interpreting Results

### Key Metrics

- **http_req_duration** - Request duration (p95 should be <5s for most endpoints)
- **http_req_failed** - Failed request rate (should be <10%)
- **rate_limit_hits** - How often rate limits are hit (should be minimal)

### Success Criteria

✅ Good:

- p95 response time < 5s (video/image) or < 10s (audio)
- Error rate < 10%
- Rate limit hits < 5% of total requests

⚠️ Warning:

- p95 response time 5-10s
- Error rate 10-20%
- Rate limit hits 5-10% of requests

❌ Poor:

- p95 response time > 10s
- Error rate > 20%
- Rate limit hits > 10% of requests

### Example Output

```
running (1m30.0s), 00/10 VUs, 150 complete and 0 interrupted iterations
default ✓ [======================================] 10 VUs  1m30s

     ✓ video generation status is 200 or 202
     ✓ response has jobId or error

     checks.........................: 100.00% ✓ 300       ✗ 0
     data_received..................: 45 kB   300 B/s
     data_sent......................: 23 kB   153 B/s
     http_req_duration..............: avg=2.1s   p(95)=4.2s
     rate_limit_hits................: 5       0.03/s
     successful_generations.........: 145     0.96/s
     failed_generations.............: 0       0/s
```

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/load-test.yml`:

```yaml
name: Load Tests

on:
  schedule:
    - cron: '0 2 * * *' # Run daily at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: grafana/setup-k6-action@v1
      - name: Run video generation load test
        run: |
          k6 run --out json=results.json k6/video-generation.test.js
        env:
          BASE_URL: ${{ secrets.STAGING_URL }}
          TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
          TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
      - uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: results.json
```

## Troubleshooting

### Rate Limits

If you're hitting rate limits frequently:

1. Reduce number of VUs
2. Increase sleep time between requests
3. Check rate limit configuration in `lib/rateLimit.ts`

### Authentication Failures

If tests fail with 401 errors:

1. Verify `TEST_EMAIL` and `TEST_PASSWORD` are correct
2. Check that the user exists in your database
3. Ensure Supabase auth is configured properly

### Timeouts

If requests timeout:

1. Check your API server is running
2. Verify `BASE_URL` is correct
3. Check if external AI services (Gemini, FAL, etc.) are responding
4. Increase timeout thresholds in test options

## Best Practices

1. **Start small** - Begin with low VU counts and short durations
2. **Test in staging** - Never load test production without approval
3. **Monitor resources** - Watch CPU, memory, and database connections
4. **Gradual ramp** - Use staged load increases, not instant spikes
5. **Realistic scenarios** - Mix different API calls like real users would
6. **Clean up** - Delete test data after load tests complete

## Further Reading

- [k6 Documentation](https://k6.io/docs/)
- [k6 Test Types](https://k6.io/docs/test-types/introduction/)
- [k6 Metrics](https://k6.io/docs/using-k6/metrics/)
- [k6 Thresholds](https://k6.io/docs/using-k6/thresholds/)
