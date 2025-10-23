/**
 * k6 Load Test - Image Generation API (Google Imagen)
 *
 * Tests /api/image/generate endpoint
 *
 * Run: k6 run k6/image-generation.test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const successCounter = new Counter('successful_generations');
const failedCounter = new Counter('failed_generations');
const rateLimitCounter = new Counter('rate_limit_hits');
const responseTrend = new Trend('generation_response_time');

export const options = {
  stages: [
    { duration: '20s', target: 5 },
    { duration: '40s', target: 5 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<8000'],
    http_req_failed: ['rate<0.2'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = __ENV.TEST_EMAIL || 'david@dreamreal.ai';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'sc3p4sses';

export function setup() {
  const loginRes = http.post(`${BASE_URL}/auth/signin`, JSON.stringify({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  let authCookie = '';
  for (let cookieName in loginRes.cookies) {
    authCookie += `${cookieName}=${loginRes.cookies[cookieName][0].value}; `;
  }

  const projectsRes = http.get(`${BASE_URL}/api/projects`, {
    headers: { 'Cookie': authCookie },
  });

  let projectId;
  if (projectsRes.json().length > 0) {
    projectId = projectsRes.json()[0].id;
  } else {
    const createRes = http.post(`${BASE_URL}/api/projects`, JSON.stringify({
      title: 'k6 Image Load Test',
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie,
      },
    });
    projectId = createRes.json().id;
  }

  return { authCookie, projectId };
}

export default function(data) {
  const { authCookie, projectId } = data;

  const prompts = [
    'A photorealistic cat wearing sunglasses',
    'A futuristic cityscape at sunset',
    'An abstract painting with vibrant colors',
    'A serene mountain landscape',
    'A modern minimalist logo design',
    'A detailed illustration of a dragon',
    'A cozy coffee shop interior',
    'A sci-fi spaceship in orbit',
  ];

  const aspectRatios = ['1:1', '16:9', '9:16', '4:3'];

  const prompt = prompts[Math.floor(Math.random() * prompts.length)];
  const aspectRatio = aspectRatios[Math.floor(Math.random() * aspectRatios.length)];

  const payload = JSON.stringify({
    prompt,
    projectId,
    aspectRatio,
  });

  const headers = {
    'Content-Type': 'application/json',
    'Cookie': authCookie,
  };

  const startTime = Date.now();
  const res = http.post(`${BASE_URL}/api/image/generate`, payload, { headers });
  const duration = Date.now() - startTime;

  responseTrend.add(duration);

  if (res.status === 429) {
    rateLimitCounter.add(1);
    console.log(`Rate limited at ${new Date().toISOString()}`);
    sleep(60);
    return;
  }

  const checks = check(res, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'response has asset data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id !== undefined || body.storage_url !== undefined;
      } catch {
        return false;
      }
    },
    'response time under 10s': () => duration < 10000,
  });

  if (checks) {
    successCounter.add(1);
  } else {
    failedCounter.add(1);
    console.error(`Failed request: status=${res.status}, body=${res.body.substring(0, 200)}`);
  }

  sleep(Math.random() * 4 + 3); // 3-7 second sleep
}

export function teardown(data) {
  console.log('=== Image Generation Load Test Summary ===');
  console.log(`Successful: ${successCounter.value || 0}`);
  console.log(`Failed: ${failedCounter.value || 0}`);
  console.log(`Rate Limited: ${rateLimitCounter.value || 0}`);
}
