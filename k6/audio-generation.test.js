/**
 * k6 Load Test - Audio Generation APIs
 *
 * Tests ElevenLabs and Suno audio generation endpoints
 *
 * Run: k6 run k6/audio-generation.test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const elevenLabsSuccess = new Counter('elevenlabs_success');
const elevenLabsFailed = new Counter('elevenlabs_failed');
const sunoSuccess = new Counter('suno_success');
const sunoFailed = new Counter('suno_failed');
const rateLimitHits = new Counter('rate_limit_hits');
const elevenLabsResponseTime = new Trend('elevenlabs_response_time');
const sunoResponseTime = new Trend('suno_response_time');

export const options = {
  stages: [
    { duration: '30s', target: 3 },
    { duration: '1m', target: 3 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<10000'], // 95% under 10s
    http_req_failed: ['rate<0.15'], // Error rate under 15%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = __ENV.TEST_EMAIL || 'david@dreamreal.ai';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'sc3p4sses';

export function setup() {
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

  let authCookie = '';
  for (let cookieName in loginRes.cookies) {
    authCookie += `${cookieName}=${loginRes.cookies[cookieName][0].value}; `;
  }

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
        title: 'k6 Audio Load Test',
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

export default function (data) {
  const { authCookie, projectId } = data;
  const headers = {
    'Content-Type': 'application/json',
    Cookie: authCookie,
  };

  // Randomly choose between ElevenLabs and Suno
  const useElevenLabs = Math.random() < 0.5;

  if (useElevenLabs) {
    // Test ElevenLabs text-to-speech
    const texts = [
      'Hello, this is a test of the text to speech system.',
      'The quick brown fox jumps over the lazy dog.',
      'Welcome to our video editor.',
      'This is an AI generated voice.',
    ];

    const text = texts[Math.floor(Math.random() * texts.length)];

    const startTime = Date.now();
    const res = http.post(
      `${BASE_URL}/api/audio/elevenlabs/generate`,
      JSON.stringify({
        text,
        projectId,
      }),
      { headers }
    );

    elevenLabsResponseTime.add(Date.now() - startTime);

    if (res.status === 429) {
      rateLimitHits.add(1);
      sleep(60);
      return;
    }

    const success = check(res, {
      'ElevenLabs status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'ElevenLabs response is valid': (r) => r.body.length > 0,
    });

    if (success) {
      elevenLabsSuccess.add(1);
    } else {
      elevenLabsFailed.add(1);
    }
  } else {
    // Test Suno music generation
    const prompts = [
      'Upbeat electronic music',
      'Calm piano melody',
      'Epic orchestral soundtrack',
      'Jazz background music',
    ];

    const prompt = prompts[Math.floor(Math.random() * prompts.length)];

    const startTime = Date.now();
    const res = http.post(
      `${BASE_URL}/api/audio/suno/generate`,
      JSON.stringify({
        prompt,
        projectId,
        duration: 30, // Short duration for tests
      }),
      { headers }
    );

    sunoResponseTime.add(Date.now() - startTime);

    if (res.status === 429) {
      rateLimitHits.add(1);
      sleep(60);
      return;
    }

    const success = check(res, {
      'Suno status is 200 or 202': (r) => r.status === 200 || r.status === 202,
      'Suno returns jobId or result': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.jobId !== undefined || body.url !== undefined;
        } catch {
          return false;
        }
      },
    });

    if (success) {
      sunoSuccess.add(1);
    } else {
      sunoFailed.add(1);
    }
  }

  sleep(Math.random() * 3 + 2); // 2-5 second sleep
}

export function teardown(data) {
  console.log('=== Audio Generation Load Test Summary ===');
  console.log(`ElevenLabs Success: ${elevenLabsSuccess.value || 0}`);
  console.log(`ElevenLabs Failed: ${elevenLabsFailed.value || 0}`);
  console.log(`Suno Success: ${sunoSuccess.value || 0}`);
  console.log(`Suno Failed: ${sunoFailed.value || 0}`);
  console.log(`Rate Limit Hits: ${rateLimitHits.value || 0}`);
}
