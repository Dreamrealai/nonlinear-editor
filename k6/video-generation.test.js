/**
 * k6 Load Test - Video Generation API
 *
 * Tests the /api/video/generate endpoint under various load conditions
 * This endpoint is rate-limited and expensive, so tests focus on:
 * - Rate limit behavior
 * - Response times under load
 * - Error handling
 * - Status polling efficiency
 *
 * Run: k6 run k6/video-generation.test.js
 * With options: k6 run --vus 10 --duration 30s k6/video-generation.test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const rateLimitHits = new Counter('rate_limit_hits');
const successfulGenerations = new Counter('successful_generations');
const failedGenerations = new Counter('failed_generations');
const responseTime = new Trend('video_generate_response_time');
const statusCheckTime = new Trend('status_check_response_time');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 5 }, // Ramp up to 5 users over 30s
    { duration: '1m', target: 5 }, // Stay at 5 users for 1 minute
    { duration: '30s', target: 10 }, // Ramp up to 10 users
    { duration: '1m', target: 10 }, // Stay at 10 users for 1 minute
    { duration: '30s', target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% of requests should be below 5s
    http_req_failed: ['rate<0.1'], // Error rate should be below 10%
    rate_limit_hits: ['count<50'], // Should not hit rate limits too often
  },
};

// Base URL - override with environment variable
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test credentials
const TEST_EMAIL = __ENV.TEST_EMAIL || 'david@dreamreal.ai';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'sc3p4sses';

let authCookie = '';
let projectId = '';

/**
 * Setup function - runs once before tests
 * Authenticates and gets a project ID
 */
export function setup() {
  // Sign in
  const loginRes = http.post(
    `${BASE_URL}/auth/signin`,
    JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const cookies = loginRes.cookies;
  let authCookie = '';

  for (let cookieName in cookies) {
    authCookie += `${cookieName}=${cookies[cookieName][0].value}; `;
  }

  // Get or create a test project
  const projectsRes = http.get(`${BASE_URL}/api/projects`, {
    headers: { Cookie: authCookie },
  });

  let projectId;
  if (projectsRes.json().length > 0) {
    projectId = projectsRes.json()[0].id;
  } else {
    const createRes = http.post(
      `${BASE_URL}/api/projects`,
      JSON.stringify({
        title: 'k6 Load Test Project',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
      }
    );
    projectId = createRes.json().id;
  }

  return { authCookie, projectId };
}

/**
 * Main test function - runs for each VU iteration
 */
export default function (data) {
  const { authCookie, projectId } = data;

  const headers = {
    'Content-Type': 'application/json',
    Cookie: authCookie,
  };

  // Test 1: Generate video
  const videoPrompts = [
    'A serene sunset over the ocean',
    'A cat playing with a ball',
    'Mountains covered in snow',
    'City streets at night with neon lights',
    'A field of flowers swaying in the wind',
  ];

  const prompt = videoPrompts[Math.floor(Math.random() * videoPrompts.length)];

  const payload = JSON.stringify({
    prompt,
    projectId,
    provider: 'fal-ai', // Use faster provider for load tests
    duration: 5, // Short duration for faster tests
  });

  const startTime = Date.now();
  const generateRes = http.post(`${BASE_URL}/api/video/generate`, payload, { headers });
  const duration = Date.now() - startTime;

  responseTime.add(duration);

  const checks = check(generateRes, {
    'video generation status is 200 or 202': (r) => r.status === 200 || r.status === 202,
    'video generation status is not 500': (r) => r.status !== 500,
    'response has jobId or error': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.jobId !== undefined || body.error !== undefined;
      } catch {
        return false;
      }
    },
  });

  // Handle rate limiting
  if (generateRes.status === 429) {
    rateLimitHits.add(1);
    console.log(`Rate limit hit at ${new Date().toISOString()}`);

    // Parse rate limit headers
    const resetTime = generateRes.headers['X-RateLimit-Reset'];
    if (resetTime) {
      const waitTime = Math.max(0, parseInt(resetTime) - Math.floor(Date.now() / 1000));
      sleep(Math.min(waitTime, 60)); // Wait up to 60 seconds
    } else {
      sleep(60); // Default 60 second wait
    }
    return;
  }

  // If generation started, check status
  if (generateRes.status === 202) {
    try {
      const body = JSON.parse(generateRes.body);
      if (body.jobId) {
        successfulGenerations.add(1);

        // Poll status a few times (don't wait for completion in load test)
        for (let i = 0; i < 3; i++) {
          sleep(2); // Wait 2 seconds between status checks

          const statusStart = Date.now();
          const statusRes = http.get(`${BASE_URL}/api/video/status?jobId=${body.jobId}`, {
            headers,
          });
          statusCheckTime.add(Date.now() - statusStart);

          check(statusRes, {
            'status check returns 200': (r) => r.status === 200,
            'status has valid format': (r) => {
              try {
                const status = JSON.parse(r.body);
                return status.status !== undefined;
              } catch {
                return false;
              }
            },
          });

          // If completed or failed, stop polling
          try {
            const status = JSON.parse(statusRes.body);
            if (status.status === 'completed' || status.status === 'failed') {
              break;
            }
          } catch {}
        }
      }
    } catch (e) {
      console.error('Failed to parse generation response:', e);
      failedGenerations.add(1);
    }
  } else if (generateRes.status >= 400) {
    failedGenerations.add(1);
  }

  // Wait before next iteration
  sleep(Math.random() * 5 + 5); // Random sleep 5-10 seconds
}

/**
 * Teardown function - runs once after all tests
 */
export function teardown(data) {
  console.log('=== Load Test Summary ===');
  console.log(`Rate limit hits: ${rateLimitHits.value || 0}`);
  console.log(`Successful generations: ${successfulGenerations.value || 0}`);
  console.log(`Failed generations: ${failedGenerations.value || 0}`);
}
